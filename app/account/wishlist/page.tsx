import Link from "next/link"
import { Heart } from "lucide-react"
import { requireUser } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

export default async function AccountWishlistPage() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.from("wishlist_items").select("product_id,created_at").eq("user_id", user.id).order("created_at", { ascending: false })
  return <div><h1 className="text-3xl font-bold">Wishlist</h1><p className="mb-8 mt-2 text-muted-foreground">Products saved to your account.</p>{!data?.length ? <div className="rounded-2xl border border-dashed p-12 text-center"><Heart className="mx-auto size-10 text-muted-foreground" /><p className="mt-4 font-semibold">Nothing saved yet</p><Link href="/shop" className="mt-2 inline-block text-sm text-primary">Browse products</Link></div> : <div className="grid gap-3">{data.map((item) => <Link className="rounded-xl border border-border p-4 font-medium hover:bg-muted" key={item.product_id} href={`/product/${item.product_id}`}>View saved product <span className="text-primary">#{item.product_id}</span></Link>)}</div>}</div>
}
