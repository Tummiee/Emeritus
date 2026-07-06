import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { calculateDiscount, type DiscountType } from "@/lib/commerce/coupons"

async function findCoupon(code: string) {
  const supabase = createAdminClient()
  return supabase.from("coupons").select("code,discount_type,discount_value,minimum_amount,usage_limit,used_count,starts_at,expires_at").eq("code", code.toUpperCase()).eq("active", true).maybeSingle()
}
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim()
  if (!code) return NextResponse.json({ error: "No coupon code provided" }, { status: 400 })
  const { data: coupon } = await findCoupon(code)
  if (!coupon) return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 })
  const now = new Date()
  if ((coupon.starts_at && new Date(coupon.starts_at) > now) || (coupon.expires_at && new Date(coupon.expires_at) < now) || (coupon.usage_limit && coupon.used_count >= coupon.usage_limit)) return NextResponse.json({ error: "Coupon is unavailable" }, { status: 400 })
  return NextResponse.json({ success: true, coupon: { code: coupon.code, discount: Number(coupon.discount_value), type: coupon.discount_type, minAmount: Number(coupon.minimum_amount) } })
}
export async function POST(request: NextRequest) {
  const { code, cartTotal } = await request.json()
  if (!code || !Number.isFinite(cartTotal) || cartTotal <= 0) return NextResponse.json({ error: "Valid code and cart total are required", discount: 0 }, { status: 400 })
  const response = await GET(new NextRequest(`${request.nextUrl.origin}/api/coupons?code=${encodeURIComponent(code)}`))
  const result = await response.json()
  if (!response.ok) return NextResponse.json({ ...result, discount: 0 }, { status: response.status })
  if (cartTotal < result.coupon.minAmount) return NextResponse.json({ error: `Minimum order amount of ₦${result.coupon.minAmount} required`, discount: 0 }, { status: 400 })
  const discount = calculateDiscount(
    cartTotal,
    result.coupon.type as DiscountType,
    result.coupon.discount,
  )
  return NextResponse.json({ success: true, coupon: result.coupon.code, discount, discountPercent: result.coupon.type === "percentage" ? result.coupon.discount : 0, newTotal: Math.max(0, cartTotal - discount) })
}
