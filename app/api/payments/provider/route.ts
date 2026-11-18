import { NextResponse } from "next/server";

import { getActivePaymentProvider } from "@/lib/payments/provider";
import { httpError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const provider = await getActivePaymentProvider();
    return NextResponse.json(
      { provider },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return httpError(error);
  }
}
