import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkoutSchema } from "@/lib/commerce/contracts";
import { openPayment } from "@/lib/payments/service";
import {
  getActivePaymentProvider,
  paymentProviderIsConfigured,
} from "@/lib/payments/provider";
import { HttpError, httpError, readJson, rateLimit } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email)
      return NextResponse.json(
        {
          error: "Sign in before checkout",
          loginUrl: "/auth/login?next=/checkout",
        },
        { status: 401 },
      );
    await rateLimit(request, "checkout", 10, user.id);
    const parsed = checkoutSchema.safeParse(await readJson(request));
    if (!parsed.success)
      throw new HttpError("Check your cart and delivery details");
    const provider = await getActivePaymentProvider();
    const { data: quote, error: quoteError } = await supabase.rpc(
      "checkout_quote",
      {
        p_items: parsed.data.items,
        p_coupon_code: parsed.data.couponCode ?? null,
        p_state: parsed.data.shippingAddress.state,
      },
    );
    if (quoteError)
      throw new HttpError(
        quoteError.code === "P0001" ? quoteError.message : "Quote unavailable",
        quoteError.code === "P0001" ? 400 : 503,
      );
    if (quote.total > 0 && !paymentProviderIsConfigured(provider))
      throw new HttpError("Payment service is not configured", 503);
    const { data, error } = await supabase.rpc("create_checkout_payment_v3", {
      p_items: parsed.data.items,
      p_shipping_address: parsed.data.shippingAddress,
      p_idempotency_key: parsed.data.idempotencyKey,
      p_reference: "EG-" + crypto.randomUUID(),
      p_coupon_code: parsed.data.couponCode ?? null,
      p_quote_id: parsed.data.quoteId,
      p_expected_provider: provider,
    });
    if (error) {
      const changed = error.message.includes("checkout inputs changed");
      const stale = error.message.includes("no longer reusable");
      if (changed || stale)
        return NextResponse.json(
          {
            error: changed
              ? "Checkout details changed. Review your total and continue again."
              : "This checkout has finished. Start again.",
            resetIdempotency: true,
          },
          { status: 409 },
        );
      throw new HttpError(
        error.code === "P0001" ? error.message : "Checkout unavailable",
        error.code === "P0001" ? 400 : 503,
      );
    }
    const payment = await openPayment(data.reference, user.id, user.email);
    return NextResponse.json(
      { success: true, data: payment },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return httpError(error);
  }
}
