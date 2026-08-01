import { NextResponse } from "next/server"

import { getActivePaymentProvider } from "@/lib/payments/provider"

export const dynamic = "force-dynamic"

export async function GET() {
  const provider = await getActivePaymentProvider()
  return NextResponse.json(
    { provider },
    { headers: { "Cache-Control": "private, no-store" } },
  )
}
