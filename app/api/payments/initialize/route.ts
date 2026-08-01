import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { amountsMatch, initializeMonnifyTransaction, MonnifyError, verifyMonnifyTransaction } from "@/lib/payments/monnify"
import { initializePaystackTransaction, PaystackError, verifyPaystackTransaction } from "@/lib/payments/paystack"
import { paystackAmountsMatch } from "@/lib/payments/paystack-utils"
import { getActivePaymentProvider, paymentProviderIsConfigured, type PaymentProvider } from "@/lib/payments/provider"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(99) })).min(1).max(100),
  shippingAddress: z.object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    phone: z.string().trim().min(7).max(30),
    address: z.string().trim().min(5).max(250),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().min(2).max(80),
    zip: z.string().trim().max(20).optional().default(""),
    country: z.string().trim().min(2).max(80).optional().default("Nigeria"),
  }),
  couponCode: z.string().trim().max(50).nullable().optional(),
  idempotencyKey: z.string().uuid(),
})

type Payment = {
  orderId: string
  orderNumber?: string
  reference: string
  amount: number | string
  currency: string
  authorizationUrl?: string | null
  accessCode?: string | null
  checkoutUrl?: string | null
  transactionReference?: string | null
  provider?: PaymentProvider
  existing: boolean
}

function checkoutData(payment: Payment, provider: PaymentProvider, checkoutUrl: string, transactionReference?: string) {
  return {
    checkoutUrl,
    provider,
    paymentReference: payment.reference,
    transactionReference: transactionReference ?? payment.reference,
    orderId: payment.orderId,
    orderNumber: payment.orderNumber,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json({ error: "Sign in before checkout", loginUrl: "/auth/login?next=/checkout" }, { status: 401 })
  }

  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Check your cart and delivery details before continuing" }, { status: 400 })
  }

  const activeProvider = await getActivePaymentProvider()
  if (!paymentProviderIsConfigured(activeProvider)) {
    return NextResponse.json({ error: activeProvider + " payment service is not configured" }, { status: 503 })
  }

  await supabase.rpc("release_expired_checkout_payments")
  const { data, error } = await supabase.rpc("create_checkout_payment_v2", {
    p_items: parsed.data.items,
    p_shipping_address: parsed.data.shippingAddress,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_reference: "EG-" + crypto.randomUUID(),
    ...(parsed.data.couponCode ? { p_coupon_code: parsed.data.couponCode } : {}),
  }).single()

  if (error || !data) {
    const stale = error?.message.includes("checkout session is no longer reusable")
    const migrationMissing = error?.message.includes("create_checkout_payment_v2") && error.message.includes("schema cache")
    return NextResponse.json({
      ...(stale ? { resetIdempotency: true } : {}),
      error: migrationMissing
        ? "Payment switching is not configured in Supabase. Apply migration 202608010001_payment_provider_switch.sql."
        : stale
          ? "This checkout session has already finished. Starting a new checkout is required."
          : error?.message || "Could not create checkout",
    }, { status: migrationMissing ? 503 : stale ? 409 : 400 })
  }

  const payment = data as Payment
  if (payment.provider !== activeProvider) {
    return NextResponse.json({
      error: "The payment provider changed. Starting a fresh checkout session.",
      resetIdempotency: true,
    }, { status: 409 })
  }

  if (activeProvider === "paystack") {
    if (payment.authorizationUrl) {
      try {
        const current = await verifyPaystackTransaction(payment.reference)
        const valid = current.reference === payment.reference
          && paystackAmountsMatch(current.amount, Number(payment.amount))
          && current.currency === String(payment.currency).toUpperCase()
        const terminal = ["success", "failed", "abandoned", "reversed"].includes(current.status)
        if (valid && terminal) {
          await createAdminClient().rpc("settle_payment", {
            p_reference: payment.reference,
            p_success: current.status === "success",
            p_provider_response: current.raw,
          })
          return NextResponse.json({
            error: "The previous checkout has finished. A fresh checkout is required.",
            resetIdempotency: true,
          }, { status: 409 })
        }
      } catch {
        // A pending Paystack checkout remains reusable through its saved URL.
      }
      return NextResponse.json({
        success: true,
        data: checkoutData(payment, "paystack", payment.authorizationUrl),
      })
    }

    if (payment.existing) {
      return NextResponse.json(
        { error: "Payment initialization is already in progress. Try again shortly." },
        { status: 409, headers: { "Retry-After": "3" } },
      )
    }

    try {
      const initialized = await initializePaystackTransaction({
        email: user.email,
        amount: Number(payment.amount),
        currency: payment.currency,
        reference: payment.reference,
        callbackUrl: request.nextUrl.origin + "/payment/callback",
        metadata: {
          orderId: payment.orderId,
          orderNumber: payment.orderNumber ?? "",
          userId: user.id,
        },
      })
      const admin = createAdminClient()
      const { error: saveError } = await admin.from("payment_attempts").update({
        authorization_url: initialized.checkoutUrl,
        access_code: initialized.accessCode,
        provider_response: initialized.raw,
      }).eq("reference", payment.reference).eq("provider", "paystack").eq("status", "pending")
      if (saveError) {
        return NextResponse.json({ error: "Payment was initialized but could not be saved. Contact support." }, { status: 500 })
      }
      await admin.from("orders").update({ payment_reference: payment.reference }).eq("id", payment.orderId)
      return NextResponse.json({
        success: true,
        data: checkoutData(payment, "paystack", initialized.checkoutUrl),
      })
    } catch (caught) {
      const failure = caught instanceof PaystackError ? caught : new PaystackError("Paystack could not initialize payment")
      return NextResponse.json({ error: failure.message }, { status: failure.status })
    }
  }

  if (payment.checkoutUrl && payment.transactionReference) {
    try {
      const current = await verifyMonnifyTransaction(payment.reference)
      if (
        current.paymentStatus === "PAID"
        && current.paymentReference === payment.reference
        && current.transactionReference === payment.transactionReference
        && current.currency === String(payment.currency).toUpperCase()
        && amountsMatch(current.amountPaid, Number(payment.amount))
      ) {
        await createAdminClient().rpc("settle_payment", {
          p_reference: payment.reference,
          p_success: true,
          p_provider_response: current.raw,
        })
        return NextResponse.json({
          error: "The previous checkout has finished. A fresh checkout is required.",
          resetIdempotency: true,
        }, { status: 409 })
      }
    } catch {
      // A pending Monnify checkout remains reusable through its saved URL.
    }
    return NextResponse.json({
      success: true,
      data: checkoutData(payment, "monnify", payment.checkoutUrl, payment.transactionReference),
    })
  }

  if (payment.existing) {
    return NextResponse.json(
      { error: "Payment initialization is already in progress. Try again shortly." },
      { status: 409, headers: { "Retry-After": "3" } },
    )
  }

  try {
    const initialized = await initializeMonnifyTransaction({
      amount: Number(payment.amount),
      customerName: parsed.data.shippingAddress.firstName + " " + parsed.data.shippingAddress.lastName,
      customerEmail: user.email,
      paymentReference: payment.reference,
      paymentDescription: "Emeritus Gadgets order " + (payment.orderNumber ?? payment.orderId),
      currencyCode: payment.currency,
      redirectUrl: request.nextUrl.origin + "/payment/callback",
      metadata: {
        orderId: payment.orderId,
        orderNumber: payment.orderNumber ?? "",
        userId: user.id,
      },
    })
    const admin = createAdminClient()
    const { error: saveError } = await admin.from("payment_attempts").update({
      checkout_url: initialized.checkoutUrl,
      provider_transaction_reference: initialized.transactionReference,
      provider_response: initialized.raw,
    }).eq("reference", payment.reference).eq("provider", "monnify").eq("status", "pending")
    if (saveError) {
      return NextResponse.json({ error: "Payment was initialized but could not be saved. Contact support." }, { status: 500 })
    }
    await admin.from("orders").update({ payment_reference: payment.reference }).eq("id", payment.orderId)
    return NextResponse.json({
      success: true,
      data: checkoutData(payment, "monnify", initialized.checkoutUrl, initialized.transactionReference),
    })
  } catch (caught) {
    const failure = caught instanceof MonnifyError ? caught : new MonnifyError("Monnify could not initialize payment")
    return NextResponse.json({ error: failure.message }, { status: failure.status })
  }
}
