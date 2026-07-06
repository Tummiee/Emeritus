import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

async function auth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

export async function GET() {
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ data: [] }, { status: 401 })
  const { data, error } = await supabase.from("wishlist_items").select("product_id").eq("user_id", user.id)
  if (error) return NextResponse.json({ error: "Could not load wishlist." }, { status: 500 })
  return NextResponse.json({ data: data.map((item) => item.product_id) })
}

export async function POST(request: Request) {
  const { supabase, user } = await auth()
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 })
  const parsed = z.object({ productId: z.string().min(1).max(120), action: z.enum(["add", "remove"]) }).safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  const result = parsed.data.action === "add"
    ? await supabase.from("wishlist_items").upsert({ user_id: user.id, product_id: parsed.data.productId })
    : await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", parsed.data.productId)
  if (result.error) return NextResponse.json({ error: "Could not update wishlist." }, { status: 500 })
  return NextResponse.json({ success: true })
}
