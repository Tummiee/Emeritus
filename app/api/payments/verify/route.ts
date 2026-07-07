import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendOrderEmailsIfPending } from "@/lib/sendEmail";

const schema = z.object({ reference: z.string().trim().min(3).max(120) });

type PaystackVerification = {
  status: boolean;
  data?: {
    status: string;
    reference: string;
    amount: number;
    currency: string;
  };
};

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Reference is required" }, { status: 400 });
  }

  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: attempt } = await userClient
    .from("payment_attempts")
    .select("order_id,amount,currency,status")
    .eq("reference", parsed.data.reference)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!attempt) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (attempt.status === "successful") {
    // Webhook settled first — still ensure emails are sent
    const admin = createAdminClient();
    await sendOrderEmailsIfPending(attempt.order_id, admin);
    return NextResponse.json({
      success: true,
      data: { status: "success", orderId: attempt.order_id },
    });
  }
  if (attempt.status === "failed") {
    return NextResponse.json(
      { error: "Payment was not successful", data: { status: "failed" } },
      { status: 400 },
    );
  }

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json(
      { error: "Payment service unavailable" },
      { status: 503 },
    );
  }

  const response = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(parsed.data.reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  ).catch(() => null);

  if (!response) {
    return NextResponse.json(
      { error: "Payment confirmation is temporarily unavailable" },
      { status: 502 },
    );
  }

  const payload =
    (await response.json().catch(() => null)) as PaystackVerification | null;
  const verified =
    response.ok &&
    payload?.status &&
    payload.data?.status === "success" &&
    payload.data.reference === parsed.data.reference &&
    payload.data.amount === Math.round(Number(attempt.amount) * 100) &&
    payload.data.currency === attempt.currency;

  if (!verified || !payload?.data) {
    return NextResponse.json(
      {
        error:
          payload?.data?.status === "pending"
            ? "Payment is still pending"
            : "Payment verification failed",
        data: { status: payload?.data?.status ?? "unknown" },
      },
      { status: payload?.data?.status === "pending" ? 202 : 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("settle_payment", {
    p_reference: parsed.data.reference,
    p_success: true,
    p_provider_response: payload.data,
  });
  if (error) {
    return NextResponse.json(
      { error: "Could not finalize payment" },
      { status: 500 },
    );
  }

  // Send email notifications (awaited to ensure delivery before response ends)
  await sendOrderEmailsIfPending(attempt.order_id, admin);

  return NextResponse.json({
    success: true,
    data: { status: "success", orderId: attempt.order_id },
  });
}
