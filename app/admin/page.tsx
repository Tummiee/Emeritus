import Link from "next/link"
import { Boxes, CircleDollarSign, Package, ShoppingCart, Users, Wrench } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function AdminDashboard() {
  const supabase = await createClient()
  const [orders, products, customers, repairs, inventory] = await Promise.all([
    supabase.from("orders").select("id,order_number,total,currency,status,created_at").order("created_at", { ascending: false }).limit(1000),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "customer"),
    supabase.from("repair_requests").select("*", { count: "exact", head: true }).in("status", ["submitted", "rescheduled"]),
    supabase.from("inventory").select("quantity,low_stock_threshold"),
  ])
  const revenue = orders.data?.filter((order) => !["cancelled","refunded"].includes(order.status)).reduce((sum, order) => sum + Number(order.total), 0) ?? 0
  const lowStock = inventory.data?.filter((item) => item.quantity <= item.low_stock_threshold).length ?? 0
  const stats = [
    ["Revenue", new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(revenue), CircleDollarSign, "/admin/revenue"],
    ["Orders", orders.data?.length ?? 0, ShoppingCart, "/admin/orders"], ["Customers", customers.count ?? 0, Users, "/admin/customers"],
    ["Products", products.count ?? 0, Package, "/admin/products"], ["Low stock", lowStock, Boxes, "/admin/inventory"], ["Pending repairs", repairs.count ?? 0, Wrench, "/admin/repairs"],
  ] as const
  return <main className="p-5 lg:p-8"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Live overview</p><h1 className="mt-1 text-3xl font-bold">Dashboard</h1><p className="mt-2 text-slate-500">Current commerce and operations data.</p></div><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label,value,Icon,href]) => <Link href={href} key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><span className="text-2xl font-bold">{value}</span></div><p className="mt-5 text-sm font-medium text-slate-500">{label}</p></Link>)}</div><section className="mt-7 rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b p-5"><h2 className="font-semibold">Recent orders</h2><Link href="/admin/orders" className="text-sm text-primary">View all</Link></div>{orders.data?.slice(0, 8).map((order) => <div key={order.id} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b px-5 py-4 last:border-0"><div><p className="font-medium">{order.order_number}</p><p className="text-xs text-slate-500">{new Date(order.created_at).toLocaleString()}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs capitalize">{order.status}</span><strong>{new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(Number(order.total))}</strong></div>)}{!orders.data?.length && <p className="p-10 text-center text-sm text-slate-500">No orders yet.</p>}</section></main>
}
