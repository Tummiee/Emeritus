import { Package } from "lucide-react"
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

  // 1. Fetch orders
  const { data: orders } = await supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(500)

  // 2. Fetch order items for all orders in one query
  const orderIds = orders?.map((o) => o.id) ?? []
  const { data: allItems } = orderIds.length
    ? await supabase
        .from("order_items")
        .select("id,order_id,product_id,name,quantity")
        .in("order_id", orderIds)
    : { data: [] }

  // 3. Fetch product thumbnails for those product IDs
  const productIds = [
    ...new Set((allItems ?? []).map((i) => i.product_id).filter(Boolean)),
  ]
  const { data: products } = productIds.length
    ? await supabase
        .from("products")
        .select("id,image_url,slug")
        .in("id", productIds)
    : { data: [] }

  const productMap = Object.fromEntries(
    (products ?? []).map((p) => [p.id, p])
  )

  const itemsByOrder = (allItems ?? []).reduce<Record<string, any[]>>((acc, item) => {
    if (!acc[item.order_id]) acc[item.order_id] = []
    acc[item.order_id]!.push(item)
    return acc
  }, {})

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
          <table className="w-full text-left text-sm border-collapse">
            <thead className="border-b bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold">Order</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Items Ordered</th>
                <th className="px-6 py-4 font-semibold">Total</th>
                <th className="px-6 py-4 font-semibold">Shipping Address</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order: any) => {
                const statusClass = statusColors[order.status] ?? "border-slate-200 text-slate-700 bg-slate-50"
                const addr = getFormattedAddress(order.shipping_address)
                const items = itemsByOrder[order.id] ?? []
                return (
                  <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition last:border-0">
                    <td className="px-6 py-5 align-top font-bold text-slate-900">{order.order_number}</td>
                    <td className="px-6 py-5 align-top text-slate-500 whitespace-nowrap">{new Date(order.created_at).toLocaleDateString("en-NG", { dateStyle: "medium" })}</td>

                    {/* Items Ordered cell */}
                    <td className="px-6 py-5 align-top min-w-[220px]">
                      <div className="flex flex-col gap-2">
                        {items.map((item: any) => {
                          const product = productMap[item.product_id]
                          const imageUrl = product?.image_url || null
                          return (
                            <div key={item.id} className="flex items-center gap-2">
                              <div className="size-8 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center">
                                {imageUrl ? (
                                  <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                  <Package className="size-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-semibold text-slate-900" title={item.name}>
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-500">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </td>

                    <td className="px-6 py-5 align-top font-semibold text-slate-900 whitespace-nowrap">
                      {new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(
                        Number(order.total),
                      )}
                    </td>

                    <td className="px-6 py-5 align-top min-w-[260px]">
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

                    <td className="px-6 py-5 align-top">
                      <form action={updateOrder} className="flex items-center gap-2">
                        <input type="hidden" name="id" value={order.id} />
                        <select
                          key={`${order.id}:${order.status}:status`}
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
        {!orders?.length && <p className="p-12 text-center text-slate-500 font-medium">No orders recorded yet.</p>}
      </div>

      {/* Mobile view: Visible only on mobile screens, hidden on md and up */}
      <div className="mt-6 space-y-4 md:hidden">
        {orders?.map((order: any) => {
          const addr = getFormattedAddress(order.shipping_address)
          const statusClass = statusColors[order.status] ?? "border-slate-200 text-slate-700 bg-slate-50"
          const items = itemsByOrder[order.id] ?? []
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
                    key={`${order.id}:${order.status}:status`}
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

              {/* Mobile Ordered Items list */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Items Ordered</p>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2.5">
                  {items.map((item: any) => {
                    const product = productMap[item.product_id]
                    const imageUrl = product?.image_url || null
                    return (
                      <div key={item.id} className="flex items-center gap-3 first:pt-0 last:pb-0 pt-2.5">
                        <div className="size-9 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                          {imageUrl ? (
                            <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <Package className="size-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

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
        {!orders?.length && <p className="p-12 text-center text-slate-500 font-medium">No orders recorded yet.</p>}
      </div>
    </main>
  )
}
