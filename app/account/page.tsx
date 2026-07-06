import Link from "next/link"
import { Bell, Heart, MapPin, Package, Wrench } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function AccountPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const [orders, wishlist, addresses, repairs, notifications] = await Promise.all([
    supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("wishlist_items").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("addresses").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("repair_requests").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ])
  const cards = [
    ["/account/orders", "Orders", orders.count ?? 0, Package],
    ["/account/wishlist", "Saved items", wishlist.count ?? 0, Heart],
    ["/account/addresses", "Addresses", addresses.count ?? 0, MapPin],
    ["/account/repairs", "Repairs", repairs.count ?? 0, Wrench],
    ["/account/notifications", "Unread", notifications.count ?? 0, Bell],
  ] as const
  return <div><h1 className="text-3xl font-bold tracking-tight">Your account</h1><p className="mt-2 text-muted-foreground">Manage purchases, saved products, delivery details, and support.</p><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(([href, label, count, Icon]) => <Link href={href} key={href} className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-center justify-between"><Icon className="size-5 text-primary" /><span className="text-2xl font-bold">{count}</span></div><p className="mt-5 font-medium">{label}</p></Link>)}</div></div>
}
