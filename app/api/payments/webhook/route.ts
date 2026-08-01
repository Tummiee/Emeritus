import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"

import {
  amountsMatch,
  isMonnifySandbox,
  verifyMonnifyTransaction,
  verifyMonnifyWebhookSignature,
} from "@/lib/payments/monnify"
import { verifyPaystackTransaction, verifyPaystackWebhookSignature } from "@/lib/payments/paystack"
import { paystackAmountsMatch } from "@/lib/payments/paystack-utils"
import { sendOrderEmailsIfPending } from "@/lib/sendEmail"
import { createAdminClient } from "@/lib/supabase/admin"

type MonnifyEvent = {
  eventType?: string
  eventData?: { paymentReference?: string; transactionReference?: string }
}
type PaystackEvent = {
  event?: string
  data?: { reference?: string }
}

async function rememberEvent(raw: string, provider: "paystack" | "monnify", eventType: string, reference: string | null, payload: unknown) {
  const eventHash = crypto.createHash("sha256").update(raw).digest("hex")
  const admin = createAdminClient()
  const { data: prior } = await admin
    .from("payment_webhook_events")
    .select("completed_at")
    .eq("event_hash", eventHash)
    .maybeSingle()

  if (!prior) {
    await admin.from("payment_webhook_events").upsert({
      event_hash: eventHash,
      event_type: eventType,
      reference,
      payload,
      provider,
    }, { onConflict: "event_hash", ignoreDuplicates: true })
  }
  return { admin, eventHash, completed: Boolean(prior?.completed_at) }
}

async function completeEvent(eventHash: string) {
  await createAdminClient()
    .from("payment_webhook_events")
    .update({ completed_at: new Date().toISOString() })
    .eq("event_hash", eventHash)
}

async function handlePaystack(raw: string, signature: string) {
  try {
    if (!verifyPaystackWebhookSignature(raw, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: "Paystack webhook is not configured" }, { status: 503 })
  }

  let event: PaystackEvent
  try {
    event = JSON.parse(raw) as PaystackEvent
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const reference = event.data?.reference ?? null
  const remembered = await rememberEvent(raw, "paystack", event.event ?? "unknown", reference, event)
  if (remembered.completed) return NextResponse.json({ success: true })

  if (event.event !== "charge.success" || !reference) {
    await completeEvent(remembered.eventHash)
    return NextResponse.json({ success: true })
  }

  const { data: attempt } = await remembered.admin
    .from("payment_attempts")
    .select("order_id,amount,currency,status")
    .eq("reference", reference)
    .eq("provider", "paystack")
    .maybeSingle()
  if (!attempt) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

  if (attempt.status !== "successful") {
    const transaction = await verifyPaystackTransaction(reference)
    const valid = transaction.status === "success"
      && transaction.reference === reference
      && paystackAmountsMatch(transaction.amount, Number(attempt.amount))
      && transaction.currency === String(attempt.currency).toUpperCase()
    if (!valid) return NextResponse.json({ error: "Transaction did not pass verification" }, { status: 422 })

    const { error } = await remembered.admin.rpc("settle_payment", {
      p_reference: reference,
      p_success: true,
      p_provider_response: transaction.raw,
    })
    if (error) return NextResponse.json({ error: "Settlement failed" }, { status: 500 })

    await remembered.admin.from("payment_attempts").update({
      payment_method: transaction.channel ?? null,
      paid_at: transaction.paidAt ?? new Date().toISOString(),
    }).eq("reference", reference)
  }

  await sendOrderEmailsIfPending(attempt.order_id, remembered.admin)
  await completeEvent(remembered.eventHash)
  return NextResponse.json({ success: true })
}

async function handleMonnify(raw: string, signature: string) {
  try {
    if ((signature && !verifyMonnifyWebhookSignature(raw, signature)) || (!signature && !isMonnifySandbox())) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: "Monnify webhook is not configured" }, { status: 503 })
  }

  let event: MonnifyEvent
  try {
    event = JSON.parse(raw) as MonnifyEvent
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const reference = event.eventData?.paymentReference ?? null
  const remembered = await rememberEvent(raw, "monnify", event.eventType ?? "unknown", reference, event)
  if (remembered.completed) return NextResponse.json({ success: true })

  if (event.eventType !== "SUCCESSFUL_TRANSACTION" || !reference) {
    await completeEvent(remembered.eventHash)
    return NextResponse.json({ success: true })
  }

  const { data: attempt } = await remembered.admin
    .from("payment_attempts")
    .select("order_id,amount,currency,status,provider_transaction_reference")
    .eq("reference", reference)
    .eq("provider", "monnify")
    .maybeSingle()
  if (!attempt) return NextResponse.json({ error: "Payment not found" }, { status: 404 })

  if (attempt.status !== "successful") {
    const transaction = await verifyMonnifyTransaction(reference)
    const valid = transaction.paymentStatus === "PAID"
      && transaction.paymentReference === reference
      && transaction.transactionReference === attempt.provider_transaction_reference
      && transaction.currency === String(attempt.currency).toUpperCase()
      && amountsMatch(transaction.amountPaid, Number(attempt.amount))
    if (!valid) return NextResponse.json({ error: "Transaction did not pass verification" }, { status: 422 })

    const { error } = await remembered.admin.rpc("settle_payment", {
      p_reference: reference,
      p_success: true,
      p_provider_response: transaction.raw,
    })
    if (error) return NextResponse.json({ error: "Settlement failed" }, { status: 500 })

    await remembered.admin.from("payment_attempts").update({
      payment_method: transaction.paymentMethod ?? null,
      paid_at: transaction.paidOn ?? new Date().toISOString(),
    }).eq("reference", reference)
  }

  await sendOrderEmailsIfPending(attempt.order_id, remembered.admin)
  await completeEvent(remembered.eventHash)
  return NextResponse.json({ success: true })
}

export async function POST(request: NextRequest) {
  const raw = await request.text()
  const paystackSignature = request.headers.get("x-paystack-signature")
  if (paystackSignature) return handlePaystack(raw, paystackSignature)

  const monnifySignature = request.headers.get("monnify-signature") ?? ""
  if (monnifySignature || process.env.MONNIFY_BASE_URL?.includes("sandbox.monnify.com")) {
    return handleMonnify(raw, monnifySignature)
  }

  return NextResponse.json({ error: "Unknown payment provider" }, { status: 401 })
}
