import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("orderId")
  if (!orderId) return NextResponse.json({ error: "Order ID is required" }, { status: 400 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: order } = await supabase.from("orders").select("id,order_number,status,tracking_number,estimated_delivery,updated_at").or(`id.eq.${orderId},order_number.eq.${orderId}`).eq("user_id", user.id).single()
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })
  const { data: events } = await supabase.from("order_tracking_events").select("status,location,description,created_at").eq("order_id", order.id).order("created_at", { ascending: false })
  return NextResponse.json({ orderId: order.order_number, status: order.status, estimatedDelivery: order.estimated_delivery, lastUpdate: order.updated_at, events: (events ?? []).map((event) => ({ ...event, timestamp: event.created_at })), carrier: "Emeritus Gadget Delivery", trackingNumber: order.tracking_number })
}
