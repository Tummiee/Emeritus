import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cartLinesSchema } from "@/lib/commerce/contracts";
import { HttpError, httpError, readJson, rateLimit } from "@/lib/http";
export async function POST(request: Request) {
  try {
    await rateLimit(request, "coupons", 60);
    const parsed = z
      .object({
        code: z.string().trim().min(1).max(50),
        items: cartLinesSchema,
      })
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError("Valid coupon and cart required");
    const { data, error } = await (
      await createClient()
    ).rpc("checkout_quote", {
      p_items: parsed.data.items,
      p_coupon_code: parsed.data.code,
      p_state: null,
    });
    if (error)
      throw new HttpError(
        error.code === "P0001" ? error.message : "Coupon service unavailable",
        error.code === "P0001" ? 400 : 503,
      );
    return NextResponse.json({
      success: true,
      coupon: data.couponCode,
      discount: data.discount,
      newTotal: data.subtotal - data.discount,
    });
  } catch (error) {
    return httpError(error);
  }
}
export async function GET() {
  return NextResponse.json(
    { error: "Submit a cart to validate coupon eligibility" },
    { status: 405 },
  );
}
