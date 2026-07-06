import { updateOrder } from "@/lib/admin/operations"
import { createClient } from "@/lib/supabase/server"

const statuses = ["pending","confirmed","processing","shipped","delivered","cancelled","refunded"]
export default async function OrdersPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500)
  return <main className="p-5 lg:p-8"><h1 className="text-3xl font-bold">Orders</h1><p className="mt-2 text-slate-500">Manage fulfilment and order state.</p><div className="mt-7 overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-4">Order</th><th className="p-4">Date</th><th className="p-4">Total</th><th className="p-4">Status</th></tr></thead><tbody>{data?.map((order) => <tr key={order.id} className="border-b"><td className="p-4 font-semibold">{order.order_number}</td><td className="p-4 text-slate-500">{new Date(order.created_at).toLocaleDateString()}</td><td className="p-4">{new Intl.NumberFormat("en-NG",{style:"currency",currency:order.currency}).format(Number(order.total))}</td><td className="p-4"><form action={updateOrder} className="flex gap-2"><input type="hidden" name="id" value={order.id} /><select name="status" defaultValue={order.status} className="rounded-lg border px-2 py-1.5">{statuses.map((status) => <option key={status}>{status}</option>)}</select><button className="rounded-lg bg-slate-900 px-3 text-xs text-white">Save</button></form></td></tr>)}</tbody></table>{!data?.length && <p className="p-12 text-center text-slate-500">No orders.</p>}</div></main>
}
