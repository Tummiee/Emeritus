import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const checks = await Promise.all([
      supabase.from("storefront_catalog").select("id").limit(1),
      supabase.from("email_outbox").select("id").limit(1),
      supabase.from("payment_reconciliation").select("reference").limit(1),
    ]);
    if (checks.some((result) => result.error))
      throw new Error("Schema unavailable");

    return NextResponse.json(
      { status: "ready", dependencies: { database: "ok" } },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable", dependencies: { database: "error" } },
      {
        status: 503,
        headers: { "Cache-Control": "no-store", "Retry-After": "10" },
      },
    );
  }
}
