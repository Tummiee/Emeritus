import Link from "next/link"
import Image from "next/image"
import { Package, Star } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function OrdersPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data: orders } = await supabase
    .from("orders")
    .select("*, order_items(quantity, products(id, name, slug, image_url))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="min-w-0">
      <h1 className="text-2xl font-bold sm:text-3xl">Orders</h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        Track your purchases and order history.
      </p>
      {!orders?.length ? (
        <Empty />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          {orders.map((order) => (
            <div key={order.id} className="border-b border-border p-4 last:border-0">
              <div className="grid min-w-0 gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
                </div>
                <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs capitalize">{order.status}</span>
                <p className="font-semibold">
                  {new Intl.NumberFormat("en-NG", { style: "currency", currency: order.currency }).format(
                    Number(order.total),
                  )}
                </p>
              </div>

              {order.order_items && order.order_items.length > 0 && (
                <div className="mt-4 space-y-4 border-t border-border pt-4">
                  {order.order_items.map((item) =>
                    item.products ? (
                      <div key={item.products.id} className="flex items-center justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border bg-muted">
                            <Image src={item.products.image_url || "/product-placeholder.svg"} alt={item.products.name} fill sizes="64px" className="object-contain p-1" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{item.products.name}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        {order.status === "delivered" && <Link href={`/product/${item.products.slug}#reviews`} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"><Star className="size-3.5" /><span>Review</span></Link>}
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
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
