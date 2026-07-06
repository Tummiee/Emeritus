import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const id = (await params).id
  const { data, error } = await supabase.from("orders").select("*,order_items(*),order_tracking_events(*)").or(`id.eq.${id},order_number.eq.${id}`).eq("user_id", user.id).single()
  if (error || !data) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  return NextResponse.json({ success: true, data })
}

export async function PATCH() {
  return NextResponse.json({ error: "Order status is managed by payment and admin workflows" }, { status: 405 })
}
