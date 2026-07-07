import { updateOrder } from "@/lib/admin/operations"
import { createClient } from "@/lib/supabase/server"

const statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"]

const statusColors: Record<string, string> = {
  pending: "border-yellow-200 text-yellow-700 bg-yellow-50 focus:border-yellow-400",
  confirmed: "border-blue-200 text-blue-700 bg-blue-50 focus:border-blue-400",
  processing: "border-indigo-200 text-indigo-700 bg-indigo-50 focus:border-indigo-400",
  shipped: "border-purple-200 text-purple-700 bg-purple-50 focus:border-purple-400",
  delivered: "border-green-200 text-green-700 bg-green-50 focus:border-green-400",
  cancelled: "border-red-200 text-red-700 bg-red-50 focus:border-red-400",
  refunded: "border-slate-200 text-slate-700 bg-slate-50 focus:border-slate-400",
}

function getFormattedAddress(shippingAddress: any) {
  if (!shippingAddress) return null
  
  const name = shippingAddress.recipient_name || 
               [shippingAddress.firstName, shippingAddress.lastName].filter(Boolean).join(" ") || 
               "Customer"
  const phone = shippingAddress.phone || ""
  const street = shippingAddress.line1 || shippingAddress.address || ""
  const street2 = shippingAddress.line2 || ""
  const city = shippingAddress.city || ""
  const state = shippingAddress.state || ""
  const zip = shippingAddress.postal_code || shippingAddress.zip || ""
  const country = shippingAddress.country || "Nigeria"

  return { name, phone, street, street2, city, state, zip, country }
}

export default async function OrdersPage() {
  const supabase = await createClient()
  const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500)

  return (
    <main className="p-5 lg:p-8">
      {/* Page Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Fulfilment</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Orders</h1>
          <p className="mt-2 text-sm text-slate-500">Manage order fulfilment, status states, and customer shipping addresses.</p>
        </div>
      </div>

      {/* Desktop view: Hidden on mobile, flex table on md screens and up */}
      <div className="mt-7 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Order</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Total</th>
                <th className="px-5 py-4 font-semibold">Shipping Address</th>
                <th className="px-5 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data?.map((order: any) => {
                const statusClass = statusColors[order.status] ?? "border-slate-200 text-slate-700 bg-slate-50"
                const addr = getFormattedAddress(order.shipping_address)
                return (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition last:border-0">
                    <td className="px-5 py-4 font-bold text-slate-900">{order.order_number}</td>
                    <td className="px-5 py-4 text-slate-500">{new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>
                    <td className="px-5 py-4 font-semibold text-slate-900">
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(
                        Number(order.total),
                      )}
                    </td>
                    <td className="px-5 py-4 min-w-[260px]">
                      {addr ? (
                        <div className="flex flex-col gap-0.5 text-xs text-slate-600 leading-normal">
                          <p className="font-semibold text-slate-900">{addr.name}</p>
                          <p>{addr.street}{addr.street2 ? `, ${addr.street2}` : ""}</p>
                          <p>{addr.city}, {addr.state} {addr.zip}</p>
                          <p className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">{addr.country}</p>
                          {addr.phone && (
                            <p className="mt-1 flex items-center gap-1 font-mono text-[11px] text-slate-500">
                              <span className="text-slate-400">📞</span> {addr.phone}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <form action={updateOrder} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={order.id} />
                        <select 
                          name="status" 
                          defaultValue={order.status} 
                          className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/15 transition ${statusClass}`}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status} className="bg-white text-slate-900 font-medium">
                              {status}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/95 transition shadow-sm">
                          Save
                        </button>
                      </form>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!data?.length && <p className="p-12 text-center text-slate-500 font-medium">No orders recorded yet.</p>}
      </div>

      {/* Mobile view: Visible only on mobile screens, hidden on md and up */}
      <div className="mt-6 space-y-4 md:hidden">
        {data?.map((order: any) => {
          const addr = getFormattedAddress(order.shipping_address)
          const statusClass = statusColors[order.status] ?? "border-slate-200 text-slate-700 bg-slate-50"
          return (
            <div key={order.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              {/* Mobile Card Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">{order.order_number}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}
                  </p>
                </div>
                <p className="text-base font-bold text-slate-900">
                  {new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(
                    Number(order.total),
                  )}
                </p>
              </div>

              {/* Status Update Form */}
              <form action={updateOrder} className="flex items-center justify-between border-y border-slate-100 py-3 gap-3">
                <input type="hidden" name="id" value={order.id} />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</span>
                <div className="flex gap-2">
                  <select 
                    name="status" 
                    defaultValue={order.status} 
                    className={`rounded-xl border px-3 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/15 transition ${statusClass}`}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status} className="bg-white text-slate-900 font-medium">
                        {status}
                      </option>
                    ))}
                  </select>
                  <button className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/95 transition shadow-sm">
                    Save
                  </button>
                </div>
              </form>

              {/* Shipping Address details */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Shipping Address</p>
                {addr ? (
                  <div className="rounded-xl bg-slate-50 p-3.5 text-xs text-slate-600 leading-normal space-y-0.5">
                    <p className="font-semibold text-slate-900">{addr.name}</p>
                    <p>{addr.street}{addr.street2 ? `, ${addr.street2}` : ""}</p>
                    <p>{addr.city}, {addr.state} {addr.zip}</p>
                    <p className="text-slate-500 font-medium text-[10px] uppercase tracking-wider">{addr.country}</p>
                    {addr.phone && (
                      <p className="mt-2 flex items-center gap-1 font-mono text-[11px] text-slate-500">
                        <span className="text-slate-400">📞</span> {addr.phone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-medium">—</p>
                )}
              </div>
            </div>
          )
        })}
        {!data?.length && <p className="p-12 text-center text-slate-500 font-medium">No orders recorded yet.</p>}
      </div>
    </main>
  )
}
