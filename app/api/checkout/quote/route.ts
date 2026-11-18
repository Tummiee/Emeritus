import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/commerce/contracts";
import { createClient } from "@/lib/supabase/server";
import { HttpError, httpError, readJson, rateLimit } from "@/lib/http";

export async function POST(request: Request) {
  try {
    await rateLimit(request, "quote", 120);
    const parsed = quoteSchema.safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError("Invalid cart or delivery state");
    const { data, error } = await (
      await createClient()
    ).rpc("checkout_quote", {
      p_items: parsed.data.items,
      p_coupon_code: parsed.data.couponCode ?? null,
      p_state: parsed.data.state ?? null,
    });
    if (error)
      throw new HttpError(
        error.code === "P0001"
          ? error.message
          : "Quote temporarily unavailable",
        error.code === "P0001" ? 400 : 503,
      );
    return NextResponse.json(
      { data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return httpError(error);
  }
}
