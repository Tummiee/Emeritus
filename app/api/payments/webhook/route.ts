import crypto from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import { amountsMatch, isMonnifySandbox, verifyMonnifyTransaction, verifyMonnifyWebhookSignature } from "@/lib/payments/monnify"
import { sendOrderEmailsIfPending } from "@/lib/sendEmail"
import { createAdminClient } from "@/lib/supabase/admin"

type Event = { eventType?:string; eventData?:{ paymentReference?:string; transactionReference?:string } }
export async function POST(request:NextRequest) {
  const raw = await request.text()
  const signature = request.headers.get("monnify-signature") ?? ""
  if ((signature && !verifyMonnifyWebhookSignature(raw, signature)) || (!signature && !isMonnifySandbox())) return NextResponse.json({ error:"Invalid signature" }, { status:401 })
  let event:Event
  try { event=JSON.parse(raw) as Event } catch { return NextResponse.json({ error:"Invalid payload" }, { status:400 }) }
  const hash=crypto.createHash("sha256").update(raw).digest("hex"), reference=event.eventData?.paymentReference
  const admin=createAdminClient()
  const { data:prior }=await admin.from("payment_webhook_events").select("completed_at").eq("event_hash",hash).maybeSingle()
  if (prior?.completed_at) return NextResponse.json({ success:true })
  await admin.from("payment_webhook_events").upsert({ event_hash:hash,event_type:event.eventType ?? "unknown",reference,payload:event,provider:"monnify" },{ onConflict:"event_hash",ignoreDuplicates:true })
  if (event.eventType !== "SUCCESSFUL_TRANSACTION" || !reference) {
    await admin.from("payment_webhook_events").update({ completed_at:new Date().toISOString() }).eq("event_hash",hash)
    return NextResponse.json({ success:true })
  }
  const { data:attempt }=await admin.from("payment_attempts").select("order_id,amount,currency,status,provider_transaction_reference").eq("reference",reference).eq("provider","monnify").maybeSingle()
  if (!attempt) return NextResponse.json({ error:"Payment not found" }, { status:404 })
  if (attempt.status === "successful") {
    await sendOrderEmailsIfPending(attempt.order_id,admin)
  } else {
    const transaction=await verifyMonnifyTransaction(reference)
    const valid=transaction.paymentStatus === "PAID" && transaction.paymentReference === reference
      && transaction.transactionReference === attempt.provider_transaction_reference
      && transaction.currency === String(attempt.currency).toUpperCase() && amountsMatch(transaction.amountPaid,Number(attempt.amount))
    if (!valid) return NextResponse.json({ error:"Transaction did not pass verification" }, { status:422 })
    const { error }=await admin.rpc("settle_payment",{ p_reference:reference,p_success:true,p_provider_response:transaction.raw })
    if (error) return NextResponse.json({ error:"Settlement failed" }, { status:500 })
    await admin.from("payment_attempts").update({ payment_method:transaction.paymentMethod ?? null,paid_at:new Date().toISOString() }).eq("reference",reference)
    await sendOrderEmailsIfPending(attempt.order_id,admin)
  }
  await admin.from("payment_webhook_events").update({ completed_at:new Date().toISOString() }).eq("event_hash",hash)
  return NextResponse.json({ success:true })
}