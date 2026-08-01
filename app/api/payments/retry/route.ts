import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { amountsMatch, initializeMonnifyTransaction, MonnifyError, verifyMonnifyTransaction } from "@/lib/payments/monnify"
import {
  classifyPaystackTransactionStatus,
  paystackAttemptHasExpired,
} from "@/lib/payments/paystack-lifecycle"
import { initializePaystackTransaction, PaystackError, verifyPaystackTransaction } from "@/lib/payments/paystack"
import { paystackAmountsMatch } from "@/lib/payments/paystack-utils"
import { paymentProviderIsConfigured, type PaymentProvider } from "@/lib/payments/provider"
import { sendOrderEmailsIfPending } from "@/lib/sendEmail"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ orderId: z.string().uuid() })

type Attempt = {
  id?: string
  orderId: string
  orderNumber?: string
  reference: string
  amount: number | string
  currency: string
  provider: PaymentProvider
  authorizationUrl?: string | null
  accessCode?: string | null
  checkoutUrl?: string | null
  transactionReference?: string | null
  expiresAt?: string | null
  existing: boolean
}

type Order = {
  id: string
  order_number: string
  status: string
  total: number | string
  currency: string
  shipping_address: Record<string, unknown> | null
}

type ReplacementReason = {
  reason: string
  provider: PaymentProvider
  previousReference: string
  providerResponse?: unknown
}

function checkoutResponse(attempt: Attempt, checkoutUrl: string, transactionReference?: string) {
  return NextResponse.json({
    success: true,
    data: {
      status: "pending",
      checkoutUrl,
      provider: attempt.provider,
      paymentReference: attempt.reference,
      transactionReference: transactionReference ?? attempt.reference,
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber,
    },
  })
}

function customerName(order: Order, email: string) {
  const address = order.shipping_address ?? {}
  const name = [address.firstName, address.lastName]
    .filter((part): part is string => typeof part === "string" && Boolean(part.trim()))
    .join(" ")
    .trim()
  return name || email.split("@")[0] || "Customer"
}

function toAttempt(data: Record<string, unknown>, orderNumber: string): Attempt {
  return {
    id: typeof data.id === "string" ? data.id : undefined,
    orderId: String(data.orderId ?? data.order_id ?? ""),
    orderNumber: String(data.orderNumber ?? orderNumber),
    reference: String(data.reference ?? ""),
    amount: data.amount as number | string,
    currency: String(data.currency ?? ""),
    provider: data.provider as PaymentProvider,
    authorizationUrl: data.authorizationUrl as string | null | undefined,
    accessCode: data.accessCode as string | null | undefined,
    checkoutUrl: data.checkoutUrl as string | null | undefined,
    transactionReference: data.transactionReference as string | null | undefined,
    expiresAt: (data.expiresAt ?? data.expires_at) as string | null | undefined,
    existing: Boolean(data.existing),
  }
}

async function settleSuccessfulAttempt(attempt: Attempt, raw: unknown) {
  const admin = createAdminClient()
  const { error } = await admin.rpc("settle_payment", {
    p_reference: attempt.reference,
    p_success: true,
    p_provider_response: raw,
  })
  if (error) throw new Error("Could not finalize the successful payment")
  await sendOrderEmailsIfPending(attempt.orderId, admin)
}

async function replaceAttempt(attempt: Attempt, userId: string, reason: ReplacementReason) {
  const { data, error } = await createAdminClient().rpc("replace_order_payment_retry", {
    p_order_id: attempt.orderId,
    p_user_id: userId,
    p_previous_reference: attempt.reference,
    p_new_reference: "EG-" + crypto.randomUUID(),
    p_idempotency_key: crypto.randomUUID(),
    p_provider_response: reason,
  }).single()

  if (error || !data) {
    const migrationMissing = error?.message.includes("replace_order_payment_retry")
    throw new PaystackError(
      migrationMissing
        ? "Paystack retry is not configured in Supabase. Apply migration 202608010003_paystack_retry_lifecycle.sql."
        : error?.message || "Could not replace the previous payment attempt",
      migrationMissing ? 503 : 409,
      migrationMissing ? "configuration" : "request",
    )
  }
  return toAttempt(data as Record<string, unknown>, attempt.orderNumber ?? "")
}

async function inspectExistingAttempt(attempt: Attempt) {
  if (attempt.provider === "paystack" && attempt.authorizationUrl) {
    let transaction
    try {
      transaction = await verifyPaystackTransaction(attempt.reference)
    } catch (caught) {
      if (caught instanceof PaystackError && caught.kind === "reference_not_found") {
        return {
          status: "replace" as const,
          reason: {
            reason: "provider_reference_not_found",
            provider: "paystack" as const,
            previousReference: attempt.reference,
            providerResponse: { message: caught.message, upstreamStatus: caught.upstreamStatus },
          },
        }
      }
      throw caught
    }

    const matches = transaction.reference === attempt.reference
      && transaction.currency === String(attempt.currency).toUpperCase()
      && paystackAmountsMatch(transaction.amount, Number(attempt.amount))
    if (!matches) throw new Error("The previous payment details did not pass verification")

    const state = classifyPaystackTransactionStatus(transaction.status)
    if (state === "successful") {
      await settleSuccessfulAttempt(attempt, transaction.raw)
      return { status: "success" as const }
    }
    if (state === "terminal") {
      return {
        status: "replace" as const,
        reason: {
          reason: "provider_transaction_" + transaction.status,
          provider: "paystack" as const,
          previousReference: attempt.reference,
          providerResponse: transaction.raw,
        },
      }
    }
    if (state === "active" && paystackAttemptHasExpired(attempt.expiresAt)) {
      return {
        status: "replace" as const,
        reason: {
          reason: "merchant_checkout_expired",
          provider: "paystack" as const,
          previousReference: attempt.reference,
          providerResponse: transaction.raw,
        },
      }
    }
    if (state === "active") {
      return { status: "reusable" as const, checkoutUrl: attempt.authorizationUrl }
    }
    throw new PaystackError("Paystack returned an unsupported transaction status", 502, "provider")
  }

  if (attempt.provider === "monnify" && attempt.checkoutUrl && attempt.transactionReference) {
    try {
      const transaction = await verifyMonnifyTransaction(attempt.reference)
      const matches = transaction.paymentReference === attempt.reference
        && transaction.transactionReference === attempt.transactionReference
        && transaction.currency === String(attempt.currency).toUpperCase()
        && amountsMatch(transaction.amountPaid, Number(attempt.amount))
      if (!matches) throw new Error("The previous payment details did not pass verification")
      if (transaction.paymentStatus === "PAID") {
        await settleSuccessfulAttempt(attempt, transaction.raw)
        return { status: "success" as const }
      }
      if (["FAILED", "EXPIRED", "CANCELLED", "REVERSED"].includes(transaction.paymentStatus)) {
        return {
          status: "replace" as const,
          reason: {
            reason: "provider_transaction_" + transaction.paymentStatus.toLowerCase(),
            provider: "monnify" as const,
            previousReference: attempt.reference,
            providerResponse: transaction.raw,
          },
        }
      }
    } catch (caught) {
      if (!(caught instanceof MonnifyError)) throw caught
      // Monnify retry behavior remains unchanged for transient verification errors.
    }
    return { status: "reusable" as const, checkoutUrl: attempt.checkoutUrl }
  }

  return { status: "initialize" as const }
}

async function initializeAttempt(attempt: Attempt, order: Order, email: string, origin: string) {
  if (!paymentProviderIsConfigured(attempt.provider)) {
    if (attempt.provider === "paystack") {
      throw new PaystackError("Paystack payment service is not configured", 503, "configuration")
    }
    throw new MonnifyError("Monnify payment service is not configured", 503)
  }

  if (attempt.provider === "paystack") {
    const initialized = await initializePaystackTransaction({
      email,
      amount: Number(attempt.amount),
      currency: attempt.currency,
      reference: attempt.reference,
      callbackUrl: origin + "/payment/callback",
      metadata: {
        orderId: attempt.orderId,
        orderNumber: attempt.orderNumber ?? order.order_number,
        retry: "true",
      },
    })
    const { error } = await createAdminClient().from("payment_attempts").update({
      authorization_url: initialized.checkoutUrl,
      access_code: initialized.accessCode,
      provider_response: initialized.raw,
    }).eq("reference", attempt.reference).eq("provider", "paystack").eq("status", "pending")
    if (error) throw new Error("Payment was initialized but its checkout link could not be saved")
    return checkoutResponse(attempt, initialized.checkoutUrl)
  }

  const initialized = await initializeMonnifyTransaction({
    amount: Number(attempt.amount),
    customerName: customerName(order, email),
    customerEmail: email,
    paymentReference: attempt.reference,
    paymentDescription: "Emeritus Gadgets order " + (attempt.orderNumber ?? order.order_number),
    currencyCode: attempt.currency,
    redirectUrl: origin + "/payment/callback",
    metadata: {
      orderId: attempt.orderId,
      orderNumber: attempt.orderNumber ?? order.order_number,
      retry: "true",
    },
  })
  const { error } = await createAdminClient().from("payment_attempts").update({
    checkout_url: initialized.checkoutUrl,
    provider_transaction_reference: initialized.transactionReference,
    provider_response: initialized.raw,
  }).eq("reference", attempt.reference).eq("provider", "monnify").eq("status", "pending")
  if (error) throw new Error("Payment was initialized but its checkout link could not be saved")
  return checkoutResponse(attempt, initialized.checkoutUrl, initialized.transactionReference)
}

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "A valid order is required" }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: "Sign in before retrying payment" }, { status: 401 })

  const { data: order } = await supabase
    .from("orders")
    .select("id,order_number,status,total,currency,shipping_address")
    .eq("id", parsed.data.orderId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  if (order.status !== "pending") {
    return NextResponse.json({ error: "Only pending orders can retry payment" }, { status: 409 })
  }

  try {
    const { data: latest } = await supabase
      .from("payment_attempts")
      .select("id,order_id,reference,amount,currency,status,provider,authorization_url,access_code,checkout_url,provider_transaction_reference,expires_at,created_at")
      .eq("order_id", order.id)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    let attempt: Attempt | null = latest ? toAttempt({
      ...latest,
      orderId: latest.order_id,
      orderNumber: order.order_number,
      authorizationUrl: latest.authorization_url,
      accessCode: latest.access_code,
      checkoutUrl: latest.checkout_url,
      transactionReference: latest.provider_transaction_reference,
      expiresAt: latest.expires_at,
      existing: true,
    }, order.order_number) : null

    if (latest?.status === "pending" && attempt) {
      const inspection = await inspectExistingAttempt(attempt)
      if (inspection.status === "success") {
        return NextResponse.json({ success: true, data: { status: "success", orderId: order.id } })
      }
      if (inspection.status === "reusable") {
        return checkoutResponse(attempt, inspection.checkoutUrl, attempt.transactionReference ?? undefined)
      }
      if (inspection.status === "initialize") {
        return await initializeAttempt(attempt, order as Order, user.email, request.nextUrl.origin)
      }
      attempt = await replaceAttempt(attempt, user.id, inspection.reason)
      if (attempt.existing && !attempt.authorizationUrl && !attempt.checkoutUrl) {
        return NextResponse.json(
          { error: "A replacement checkout is already being prepared. Try again shortly." },
          { status: 409, headers: { "Retry-After": "2" } },
        )
      }
    } else {
      attempt = null
    }

    if (!attempt) {
      const { data, error } = await supabase.rpc("create_order_payment_retry", {
        p_order_id: order.id,
        p_reference: "EG-" + crypto.randomUUID(),
        p_idempotency_key: crypto.randomUUID(),
      }).single()
      if (error || !data) {
        const migrationMissing = error?.message.includes("create_order_payment_retry")
        return NextResponse.json({
          error: migrationMissing
            ? "Payment retry is not configured in Supabase. Apply migration 202608010002_order_payment_retry.sql."
            : error?.message || "Could not create a payment retry",
        }, { status: migrationMissing ? 503 : 409 })
      }
      attempt = toAttempt(data as Record<string, unknown>, order.order_number)
    }

    if (attempt.authorizationUrl && attempt.provider === "paystack") {
      return checkoutResponse(attempt, attempt.authorizationUrl)
    }
    if (attempt.checkoutUrl && attempt.provider === "monnify") {
      return checkoutResponse(attempt, attempt.checkoutUrl, attempt.transactionReference ?? undefined)
    }
    return await initializeAttempt(attempt, order as Order, user.email, request.nextUrl.origin)
  } catch (caught) {
    const failure = caught instanceof PaystackError || caught instanceof MonnifyError
      ? caught
      : new Error(caught instanceof Error ? caught.message : "Payment retry could not be started")
    const status = failure instanceof PaystackError || failure instanceof MonnifyError ? failure.status : 500
    return NextResponse.json({ error: failure.message }, { status })
  }
}
