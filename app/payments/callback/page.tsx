import { redirect } from "next/navigation"

export default async function LegacyPaymentCallbackPage({
  searchParams,
}: {
  searchParams: Promise<{
    paymentReference?: string
    transactionReference?: string
    paymentStatus?: string
    reference?: string
  }>
}) {
  const params = await searchParams
  const query = new URLSearchParams()
  const reference = params.paymentReference ?? params.reference
  if (reference) query.set("paymentReference", reference)
  if (params.transactionReference) query.set("transactionReference", params.transactionReference)
  if (params.paymentStatus) query.set("paymentStatus", params.paymentStatus)
  redirect("/payment/callback" + (query.size ? "?" + query.toString() : ""))
}
