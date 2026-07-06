import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const country = (request.nextUrl.searchParams.get("country") || "NG").toUpperCase()
  const supabase = await createClient()
  const { data, error } = await supabase.from("tax_rules")
    .select("name,rate,country_code,applies_to")
    .eq("country_code", country)
    .eq("active", true)
    .order("created_at")
    .limit(1)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    success: true,
    data: data ? { name: data.name, rate: Number(data.rate), country: data.country_code, appliesTo: data.applies_to } : null,
  })
}
