import Link from "next/link"
import Image from "next/image"
import { Package, Star } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function OrdersPage() {
  const user = await requireUser()
  const supabase = await createClient()

   // 1. Fetch orders
  const { data: orders } = await supabase
    .from("orders")
    .select("id,order_number,status,total,currency,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

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
    <div className="min-w-0">
      <h1 className="text-2xl font-bold sm:text-3xl">Orders</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        Track your purchases and order history.
      </p>

      {!orders?.length ? (
        <Empty />
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => {
            const isDelivered = order.status === "delivered"
            const items = itemsByOrder[order.id] ?? []

            return (
              <div
                key={order.id}
                className="overflow-hidden rounded-2xl border border-border bg-card"
              >
                {/* ── Order header ─────────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{order.order_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-NG", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusBadge status={order.status} />
                    <p className="font-semibold tabular-nums">
                      {new Intl.NumberFormat("en-NG", {
                        style: "currency",
                        currency: order.currency,
                      }).format(Number(order.total))}
                    </p>
                  </div>
                </div>

                {/* ── Order items ───────────────────────────────────── */}
                {items.length > 0 && (
                  <ul className="divide-y divide-border">
                    {items.map((item) => {
                      const product = productMap[item.product_id]
                      const productId: string = product?.id ?? item.product_id
                      const imageUrl: string | null = product?.image_url ?? null
                      const productHref = `/product/${productId}`

                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 px-4 py-3"
                        >
                          {/* Tiny product image thumbnail */}
                          <Link
                            href={productHref}
                            className="shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                            style={{ width: 44, height: 44 }}
                            aria-label={`View ${item.name}`}
                          >
                            {imageUrl ? (
                              <Image
                                src={imageUrl}
                                alt={item.name}
                                width={44}
                                height={44}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="m-auto h-full w-full p-2 text-muted-foreground" />
                            )}
                          </Link>

                          {/* Product name + qty */}
                          <div className="min-w-0 flex-1">
                            <Link
                              href={productHref}
                              className="block truncate text-sm font-medium hover:underline hover:underline-offset-2"
                            >
                              {item.name}
                            </Link>
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          </div>

                          {/* ⭐ Review badge — only for delivered orders */}
                         {isDelivered && (
                            <Link
                              href={`${productHref}#reviews`}
                              className="flex shrink-0 items-center gap-1 rounded-full border border-amber-400/60 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-400 dark:hover:bg-amber-950/70"
                            >
                              <Star className="size-3 fill-amber-400 text-amber-400" />
                              Review
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ── Status badge ──────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending:    "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
    confirmed:  "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    processing: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
    shipped:    "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400",
    delivered:  "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
    cancelled:  "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    refunded:   "bg-muted text-muted-foreground",
  }
  const cls = map[status] ?? "bg-muted text-muted-foreground"
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  )
}

/* ── Empty state ────────────────────────────────────────────────────── */
function Empty() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center sm:p-12">
      <Package className="mx-auto size-10 text-muted-foreground" />
      <p className="mt-4 font-semibold">No orders yet</p>
      <Link href="/shop" className="mt-2 inline-block text-sm text-primary">
        Start shopping
      </Link>
    </div>
  )
}
