import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { productSelect, toStorefrontProduct, type ProductRow } from "@/lib/supabase/catalog"

export async function GET(request: NextRequest) {
  const term = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = Math.min(50, Math.max(1, Number(request.nextUrl.searchParams.get("limit")) || 10))
  if (term.length < 2) return NextResponse.json({ success: true, data: [], count: 0 })
  const escaped = term.replace(/[%_,()]/g, "")
  const supabase = await createClient()
  const { data, error } = await supabase.from("products").select(productSelect).eq("active", true)
    .or(`name.ilike.%${escaped}%,description.ilike.%${escaped}%`).limit(limit)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const products = (data as unknown as ProductRow[]).map(toStorefrontProduct)
  return NextResponse.json({ success: true, data: products, count: products.length, query: term })
}
