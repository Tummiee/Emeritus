import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { openPayment } from "@/lib/payments/service";
import { HttpError, httpError, readJson, rateLimit } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email)
      throw new HttpError("Sign in before retrying payment", 401);
    await rateLimit(request, "payment-retry", 10, user.id);
    const parsed = z
      .object({ orderId: z.string().uuid() })
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError("A valid order is required");
    const { data, error } = await supabase.rpc("create_order_payment_retry", {
      p_order_id: parsed.data.orderId,
      p_reference: "EG-" + crypto.randomUUID(),
      p_idempotency_key: crypto.randomUUID(),
    });
    if (error)
      throw new HttpError(
        error.code === "P0001" ? error.message : "Payment retry unavailable",
        409,
      );
    const payment = await openPayment(data.reference, user.id, user.email);
    return NextResponse.json(
      { success: true, data: payment },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return httpError(error);
  }
}
