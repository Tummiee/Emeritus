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

  // Fetch approved reviews — use user_id to manually look up profile names
  // instead of relying on PostgREST implicit join through auth.users
  const { data: reviews, error: reviewsError } = await supabase
    .from("product_reviews")
    .select("id,product_id,user_id,rating,title,body,created_at,verified_purchase")
    .eq("product_id", product.id)
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  if (reviewsError) {
    console.error("Failed to fetch reviews", reviewsError)
  }

  // Look up profile names for review authors
  const reviewRows = reviews ?? []
  const userIds = [...new Set(reviewRows.map((r: any) => r.user_id).filter(Boolean))]
  let profileMap: Record<string, { first_name: string; last_name: string }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,first_name,last_name")
      .in("id", userIds)
    if (profiles) {
      profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]))
    }
  }

  const mappedReviews = reviewRows.map((review: any) => {
    const profile = profileMap[review.user_id]
    return {
      id: review.id,
      productId: review.product_id,
      rating: review.rating,
      title: review.title,
      content: review.body,
      author: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer",
      date: review.created_at,
      verified: review.verified_purchase,
    }
  })

  return NextResponse.json({ success: true, data: { ...product, reviewsList: mappedReviews } })
}
