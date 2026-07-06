import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
  })).min(1).max(100),
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

type CheckoutPayment = {
  orderId: string
  orderNumber?: string
  reference: string
  amount: number | string
  currency: string
  authorizationUrl?: string | null
  accessCode?: string | null
  existing: boolean
}

type PaystackInitializeResponse = {
  status: boolean
  message: string
  data?: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

type PaystackVerificationResponse = {
  status: boolean
  data?: {
    status: string
    reference: string
    amount: number
    currency: string
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    return NextResponse.json(
      { error: "Sign in before checkout", loginUrl: "/auth/login?next=/checkout" },
      { status: 401 },
    )
  }

  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check your cart and delivery details before continuing" },
      { status: 400 },
    )
  }

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return NextResponse.json({ error: "Payment service unavailable" }, { status: 503 })

  await supabase.rpc("release_expired_checkout_payments")

  const reference = `EG-${crypto.randomUUID()}`
  const checkoutArguments = {
    p_items: parsed.data.items,
    p_shipping_address: parsed.data.shippingAddress,
    p_idempotency_key: parsed.data.idempotencyKey,
    p_reference: reference,
    ...(parsed.data.couponCode ? { p_coupon_code: parsed.data.couponCode } : {}),
  }
  const { data: paymentData, error: orderError } = await supabase
    .rpc("create_checkout_payment_v2", checkoutArguments)
    .single()

  if (orderError || !paymentData) {
    const migrationMissing = orderError?.message.includes("create_checkout_payment_v2") && orderError.message.includes("schema cache")
    const staleCheckout = orderError?.message.includes("checkout session is no longer reusable")
    return NextResponse.json({
      ...(staleCheckout ? { resetIdempotency: true } : {}),
      error: migrationMissing
        ? "Paystack checkout is not configured in Supabase. Apply migration 202607030002_checkout_payment_update.sql."
        : staleCheckout
          ? "This checkout session has already finished. Starting a new checkout is required."
        : orderError?.message || "Could not create checkout",
    }, { status: migrationMissing ? 503 : staleCheckout ? 409 : 400 })
  }

  const payment = paymentData as CheckoutPayment
  if (payment.authorizationUrl) {
    const verificationResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(payment.reference)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      },
    ).catch(() => null)
    const verification = verificationResponse
      ? await verificationResponse.json().catch(() => null) as PaystackVerificationResponse | null
      : null
    const providerStatus = verification?.data?.status
    const terminal = providerStatus === "success"
      || providerStatus === "failed"
      || providerStatus === "abandoned"
      || providerStatus === "reversed"

    if (
      terminal
      && verificationResponse?.ok
      && verification?.status
      && verification.data?.reference === payment.reference
      && verification.data.amount === Math.round(Number(payment.amount) * 100)
      && verification.data.currency === payment.currency
    ) {
      const { error: reconciliationError } = await createAdminClient().rpc("settle_payment", {
        p_reference: payment.reference,
        p_success: providerStatus === "success",
        p_provider_response: verification.data,
      })
      if (reconciliationError) {
        return NextResponse.json(
          { error: "Could not reconcile the previous checkout" },
          { status: 500 },
        )
      }
      return NextResponse.json(
        {
          error: "The previous checkout has finished. A fresh checkout is required.",
          resetIdempotency: true,
        },
        { status: 409 },
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        authorization_url: payment.authorizationUrl,
        access_code: payment.accessCode,
        reference: payment.reference,
        orderId: payment.orderId,
        orderNumber: payment.orderNumber,
      },
    })
  }
  if (payment.existing) {
    return NextResponse.json(
      { error: "Payment initialization is already in progress. Try again shortly." },
      { status: 409, headers: { "Retry-After": "3" } },
    )
  }

  let paystackResponse: Response
  try {
    paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
      body: JSON.stringify({
        email: user.email,
        amount: String(Math.round(Number(payment.amount) * 100)),
        currency: payment.currency,
        reference: payment.reference,
        // Paystack appends `reference`/`trxref` to this URL. The callback uses
        // that transaction reference to verify and settle the pending payment.
        callback_url: `${request.nextUrl.origin}/payment/callback`,
        metadata: {
          orderId: payment.orderId,
          orderNumber: payment.orderNumber,
          userId: user.id,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    })
  } catch {
    return NextResponse.json(
      { error: "Paystack could not be reached. Retry with the same checkout." },
      { status: 502 },
    )
  }

  const payload = await paystackResponse.json().catch(() => null) as PaystackInitializeResponse | null
  const initialized = Boolean(
    paystackResponse.ok &&
    payload?.status &&
    payload.data?.reference === payment.reference &&
    payload.data.authorization_url,
  )
  const admin = createAdminClient()

  if (!initialized || !payload?.data) {
    await admin.rpc("settle_payment", {
      p_reference: payment.reference,
      p_success: false,
      p_provider_response: payload ?? { message: "Invalid Paystack response" },
    })
    return NextResponse.json(
      { error: payload?.message || "Paystack could not initialize payment" },
      { status: 502 },
    )
  }

  const { error: saveError } = await admin
    .from("payment_attempts")
    .update({
      authorization_url: payload.data.authorization_url,
      access_code: payload.data.access_code,
    })
    .eq("reference", payment.reference)
    .eq("status", "pending")

  if (saveError) {
    return NextResponse.json(
      { error: "Payment was initialized but could not be saved. Contact support." },
      { status: 500 },
    )
  }

  await admin.from("orders").update({ payment_reference: payment.reference }).eq("id", payment.orderId)
  return NextResponse.json({
    success: true,
    data: {
      ...payload.data,
      orderId: payment.orderId,
      orderNumber: payment.orderNumber,
    },
  })
}
