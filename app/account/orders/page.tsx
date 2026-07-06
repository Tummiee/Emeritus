import Link from "next/link"
import { Package } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function OrdersPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: orders } = await supabase.from("orders").select("id,order_number,status,total,currency,created_at").eq("user_id", user.id).order("created_at", { ascending: false })
  return <div><h1 className="text-3xl font-bold">Orders</h1><p className="mb-8 mt-2 text-muted-foreground">Track your purchases and order history.</p>{!orders?.length ? <Empty /> : <div className="overflow-hidden rounded-2xl border border-border">{orders.map((order) => <div key={order.id} className="grid gap-2 border-b border-border p-4 last:border-0 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><p className="font-semibold">{order.order_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p></div><span className="w-fit rounded-full bg-muted px-3 py-1 text-xs capitalize">{order.status}</span><p className="font-semibold">{new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(Number(order.total))}</p></div>)}</div>}</div>
}
function Empty() { return <div className="rounded-2xl border border-dashed border-border p-12 text-center"><Package className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-semibold">No orders yet</p><Link href="/shop" className="mt-2 inline-block text-sm text-primary">Start shopping</Link></div> }
