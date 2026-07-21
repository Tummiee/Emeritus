import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { amountsMatch, MonnifyError, verifyMonnifyTransaction } from "@/lib/payments/monnify"
import { sendOrderEmailsIfPending } from "@/lib/sendEmail"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const schema = z.object({ reference:z.string().trim().min(3).max(160) })
export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error:"Payment reference is required" }, { status:400 })
  const supabase = await createClient()
  const { data:{ user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error:"Unauthorized" }, { status:401 })
  const { data:attempt } = await supabase.from("payment_attempts").select("order_id,amount,currency,status,provider,provider_transaction_reference").eq("reference", parsed.data.reference).eq("user_id", user.id).maybeSingle()
  if (!attempt) return NextResponse.json({ error:"Payment not found" }, { status:404 })
  if (attempt.provider !== "monnify") return NextResponse.json({ error:"This payment uses a retired provider" }, { status:409 })
  if (attempt.status === "successful") {
    await sendOrderEmailsIfPending(attempt.order_id, createAdminClient())
    return NextResponse.json({ success:true, data:{ status:"success", orderId:attempt.order_id } })
  }
  if (attempt.status === "failed") return NextResponse.json({ error:"Payment was not successful", data:{ status:"failed" } }, { status:400 })
  try {
    const transaction = await verifyMonnifyTransaction(parsed.data.reference)
    if (transaction.paymentStatus === "PENDING") return NextResponse.json({ error:"Payment is still pending", data:{ status:"pending" } }, { status:202 })
    if (transaction.paymentStatus !== "PAID") return NextResponse.json({ error:"Payment was not successful", data:{ status:"failed" } }, { status:400 })
    const valid = transaction.paymentReference === parsed.data.reference && Boolean(attempt.provider_transaction_reference)
      && transaction.transactionReference === attempt.provider_transaction_reference
      && transaction.currency === String(attempt.currency).toUpperCase() && amountsMatch(transaction.amountPaid, Number(attempt.amount))
    if (!valid) return NextResponse.json({ error:"Payment details did not pass verification" }, { status:422 })
    const admin = createAdminClient()
    const { error } = await admin.rpc("settle_payment", { p_reference:parsed.data.reference, p_success:true, p_provider_response:transaction.raw })
    if (error) return NextResponse.json({ error:"Could not finalize payment" }, { status:500 })
    await admin.from("payment_attempts").update({ payment_method:transaction.paymentMethod ?? null, paid_at:new Date().toISOString() }).eq("reference", parsed.data.reference)
    await sendOrderEmailsIfPending(attempt.order_id, admin)
    return NextResponse.json({ success:true, data:{ status:"success", orderId:attempt.order_id } })
  } catch (caught) {
    const error = caught instanceof MonnifyError ? caught : new MonnifyError("Payment confirmation is temporarily unavailable")
    return NextResponse.json({ error:error.message, data:{ status:"pending" } }, { status:error.status })
  }
}