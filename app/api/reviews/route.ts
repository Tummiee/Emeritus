import { NextRequest, NextResponse } from "next/server"
import { reviewErrorMessage, reviewSubmissionSchema } from "@/lib/reviews/validation"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  let query = supabase.from("product_reviews").select("id,product_id,rating,title,body,created_at,verified_purchase,profiles(first_name,last_name)").eq("status", "approved").order("created_at", { ascending: false })
  const productId = request.nextUrl.searchParams.get("productId")
  if (productId) query = query.eq("product_id", productId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const reviews = (data ?? []).map((row: any) => ({ id: row.id, productId: row.product_id, rating: row.rating, title: row.title, content: row.body, date: row.created_at, author: [row.profiles?.first_name, row.profiles?.last_name].filter(Boolean).join(" ") || "Customer", verified: row.verified_purchase }))
  return NextResponse.json({ success: true, data: reviews, count: reviews.length })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in to review a product" }, { status: 401 })
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid review request" }, { status: 400 })
  }
  const parsed = reviewSubmissionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: reviewErrorMessage(parsed.error) }, { status: 400 })

  const { data: product } = await supabase.from("products").select("id").eq("id", parsed.data.productId).eq("active", true).maybeSingle()
  if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 })

  const { data: existing } = await supabase
    .from("product_reviews")
    .select("id,status")
    .eq("product_id", parsed.data.productId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: existing.status === "pending" ? "Your review is awaiting approval" : "You have already reviewed this product" },
      { status: 409 },
    )
  }

  const { data: deliveredOrders } = await supabase
    .from("orders")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "delivered")
  const orderIds = deliveredOrders?.map((order) => order.id) ?? []
  let verifiedPurchase = false
  if (orderIds.length) {
    const { data: purchasedItem } = await supabase
      .from("order_items")
      .select("id")
      .in("order_id", orderIds)
      .eq("product_id", parsed.data.productId)
      .limit(1)
      .maybeSingle()
    verifiedPurchase = Boolean(purchasedItem)
  }

  const { data, error } = await supabase.from("product_reviews").insert({
    product_id: parsed.data.productId,
    user_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.content,
    status: "pending",
    verified_purchase: verifiedPurchase,
  }).select().single()
  if (error?.code === "23505") return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 })
  if (error) return NextResponse.json({ error: "Could not submit your review" }, { status: 400 })
  return NextResponse.json({ success: true, data, message: "Review submitted for moderation" }, { status: 201 })
}
