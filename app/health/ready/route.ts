import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

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
