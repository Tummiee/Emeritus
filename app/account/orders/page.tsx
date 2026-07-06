import Link from "next/link"
import { Package } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function OrdersPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: orders } = await supabase.from("orders").select("id,order_number,status,total,currency,created_at").eq("user_id", user.id).order("created_at", { ascending: false })
  return <div className="min-w-0"><h1 className="text-2xl font-bold sm:text-3xl">Orders</h1><p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">Track your purchases and order history.</p>{!orders?.length ? <Empty /> : <div className="overflow-hidden rounded-2xl border border-border">{orders.map((order) => <div key={order.id} className="grid min-w-0 gap-2 border-b border-border p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"><div className="min-w-0"><p className="truncate font-semibold">{order.order_number}</p><p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p></div><span className="w-fit rounded-full bg-muted px-3 py-1 text-xs capitalize">{order.status}</span><p className="font-semibold">{new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(Number(order.total))}</p></div>)}</div>}</div>
}
function Empty() { return <div className="rounded-2xl border border-dashed border-border p-8 text-center sm:p-12"><Package className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-semibold">No orders yet</p><Link href="/shop" className="mt-2 inline-block text-sm text-primary">Start shopping</Link></div> }
