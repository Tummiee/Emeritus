import Link from "next/link"
import { Heart } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function AccountWishlistPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.from("wishlist_items").select("product_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false })
  return <div className="min-w-0"><h1 className="text-2xl font-bold sm:text-3xl">Wishlist</h1><p className="mb-6 mt-2 text-sm text-muted-foreground sm:mb-8 sm:text-base">Products saved to your account.</p>{!data?.length ? <div className="rounded-2xl border border-dashed p-8 text-center sm:p-12"><Heart className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-semibold">Nothing saved yet</p><Link href="/shop" className="mt-2 inline-block text-sm text-primary">Browse products</Link></div> : <div className="grid min-w-0 gap-3">{data.map((item) => <Link className="min-w-0 rounded-xl border border-border p-4 font-medium hover:bg-muted" key={item.product_id} href={`/product/${item.product_id}`}>View saved product <span className="block truncate text-sm text-primary sm:inline">#{item.product_id}</span></Link>)}</div>}</div>
}
