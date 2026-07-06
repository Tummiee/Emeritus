import { NextRequest, NextResponse } from "next/server"
import { reviewErrorMessage, reviewSubmissionSchema } from "@/lib/reviews/validation"
import { createClient } from "@/lib/supabase/server"

type ReviewEligibilityReason =
  | "eligible"
  | "sign-in"
  | "not-purchased"
  | "pending"
  | "already-reviewed"


async function eligibility(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  userId: string,
): Promise<{ canReview: boolean; reason: ReviewEligibilityReason }> {
  const { data: existing, error: existingError } = await supabase
    .from("product_reviews")
    .select("status")
    .eq("product_id", productId)
    .eq("user_id", userId)
    .maybeSingle()
  if (existingError) throw existingError
  if (existing) {
    return {
      canReview: false,
      reason: existing.status === "pending" ? "pending" : "already-reviewed",
    }
  }

  const { data: purchased, error: purchaseError } = await supabase.rpc(
    "has_delivered_product",
    { p_product_id: productId },
  )
  if (purchaseError) throw purchaseError
  return purchased
    ? { canReview: true, reason: "eligible" }
    : { canReview: false, reason: "not-purchased" }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const productId = request.nextUrl.searchParams.get("productId")
  if (request.nextUrl.searchParams.get("eligibility") === "true") {
    const parsedProductId = reviewSubmissionSchema.shape.productId.safeParse(productId)
    if (!parsedProductId.success) {
      return NextResponse.json({ error: "Invalid product" }, { status: 400 })
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({
        data: { canReview: false, reason: "sign-in" satisfies ReviewEligibilityReason },
      })
    }
    try {
      return NextResponse.json({
        data: await eligibility(supabase, parsedProductId.data, user.id),
      })
    } catch (error) {
      console.error("Review eligibility check failed", error)
      return NextResponse.json(
        { error: "Review eligibility could not be checked." },
        { status: 500 },
      )
    }
  }

  let query = supabase.from("product_reviews").select("id,product_id,user_id,rating,title,body,created_at,verified_purchase").eq("status", "approved").order("created_at", { ascending: false })
  if (productId) query = query.eq("product_id", productId)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Look up profile names for review authors
  const rows = data ?? []
  const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))]
  let profileMap: Record<string, { first_name: string | null; last_name: string | null }> = {}
  if (userIds.length > 0) {
    const { data: profiles } = await supabase.from("profiles").select("id,first_name,last_name").in("id", userIds)
    if (profiles) profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]))
  }

  const reviews = rows.map((row: any) => {
    const profile = profileMap[row.user_id]
    return {
      id: row.id,
      productId: row.product_id,
      rating: row.rating,
      title: row.title,
      content: row.body,
      date: row.created_at,
      author: [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Customer",
      verified: row.verified_purchase,
    }
  })
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

  let reviewEligibility
  try {
    reviewEligibility = await eligibility(supabase, parsed.data.productId, user.id)
  } catch (error) {
    console.error("Review eligibility check failed", error)
    return NextResponse.json(
      { error: "Review eligibility could not be checked. Please try again." },
      { status: 500 },
    )
  }
  if (!reviewEligibility.canReview) {
    const message = reviewEligibility.reason === "pending"
      ? "Your review is awaiting approval"
      : reviewEligibility.reason === "already-reviewed"
        ? "You have already reviewed this product"
        : "Only customers who have received this product can review it"
    return NextResponse.json(
      { error: message },
      { status: reviewEligibility.reason === "not-purchased" ? 403 : 409 },
    )
  }

  const { data, error } = await supabase.from("product_reviews").insert({
    product_id: parsed.data.productId,
    user_id: user.id,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.content,
    status: "pending",
    verified_purchase: true,
  }).select().single()
  if (error?.code === "23505") return NextResponse.json({ error: "You have already reviewed this product" }, { status: 409 })
  if (error) {
    console.error("Review submission failed", error)
    const configurationError = error.code === "42501" || error.code === "42883"
    return NextResponse.json(
      { error: configurationError ? "Verified reviews are not configured yet." : "Could not submit your review" },
      { status: configurationError ? 503 : 400 },
    )
  }
  return NextResponse.json({ success: true, data, message: "Review submitted for moderation" }, { status: 201 })
}
