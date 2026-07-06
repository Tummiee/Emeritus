import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { productSelect, toStorefrontProduct, type ProductRow } from "@/lib/supabase/catalog"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const identifier = (await params).id
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(identifier)
  const productQuery = supabase.from("products").select(productSelect).eq("active", true)
  const { data, error } = await (isUuid ? productQuery.eq("id", identifier) : productQuery.eq("slug", identifier)).single()
  if (error || !data) return NextResponse.json({ error: "Product not found" }, { status: 404 })
  const product = toStorefrontProduct(data as unknown as ProductRow)
  const { data: reviews } = await supabase
    .from("product_reviews")
    .select("id,product_id,rating,title,body,created_at,verified_purchase,profiles(first_name,last_name)")
    .eq("product_id", product.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
  const mappedReviews = (reviews ?? []).map((review: any) => ({
    id: review.id, productId: review.product_id, rating: review.rating, title: review.title,
    content: review.body, author: [review.profiles?.first_name, review.profiles?.last_name].filter(Boolean).join(" ") || "Customer",
    date: review.created_at, verified: review.verified_purchase,
  }))
  return NextResponse.json({ success: true, data: { ...product, reviewsList: mappedReviews } })
}
