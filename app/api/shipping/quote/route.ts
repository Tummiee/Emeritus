import { NextResponse } from "next/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

const schema = z.object({
  state: z.string().trim().min(2).max(80),
  country: z.string().trim().min(2).max(80),
  merchandiseTotal: z.number().min(0).max(1_000_000_000),
})

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a valid delivery state." }, { status: 400 })
  }
  if (!["nigeria", "ng"].includes(parsed.data.country.toLowerCase())) {
    return NextResponse.json(
      { error: "Shipping is currently available only within Nigeria." },
      { status: 400 },
    )
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("calculate_shipping", {
    p_state: parsed.data.state,
    p_merchandise_total: parsed.data.merchandiseTotal,
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  return NextResponse.json({ data })
}
