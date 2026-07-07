import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderEmailsIfPending } from "@/lib/sendEmail";

type PaystackEvent = {
  event?: string;
  data?: {
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
  };
};

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
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: "Webhook unavailable" }, { status: 503 });
  }

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = crypto.createHmac("sha512", secret).update(raw).digest("hex");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw) as PaystackEvent;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const eventHash = crypto.createHash("sha256").update(raw).digest("hex");
  const reference = event.data?.reference ?? null;
  const admin = createAdminClient();
  const { data: prior } = await admin
    .from("payment_webhook_events")
    .select("completed_at")
    .eq("event_hash", eventHash)
    .maybeSingle();

  if (prior?.completed_at) {
    return NextResponse.json({ success: true });
  }

  await admin.from("payment_webhook_events").upsert(
    {
      event_hash: eventHash,
      event_type: event.event ?? "unknown",
      reference,
      payload: event,
    },
    { onConflict: "event_hash", ignoreDuplicates: true },
  );

  if (event.event !== "charge.success" || !reference) {
    await admin
      .from("payment_webhook_events")
      .update({ completed_at: new Date().toISOString() })
      .eq("event_hash", eventHash);
    return NextResponse.json({ success: true });
  }

  const { data: attempt } = await admin
    .from("payment_attempts")
    .select("order_id,amount,currency,status")
    .eq("reference", reference)
    .maybeSingle();

  if (!attempt || attempt.status === "successful") {
    // Payment already settled (verify route or prior webhook) — still ensure emails sent
    if (attempt?.order_id) {
      await sendOrderEmailsIfPending(attempt.order_id, admin);
    }
    await admin
      .from("payment_webhook_events")
      .update({ completed_at: new Date().toISOString() })
      .eq("event_hash", eventHash);
    return NextResponse.json({ success: true });
  }

  const verificationResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    },
  ).catch(() => null);

  if (!verificationResponse) {
    return NextResponse.json(
      { error: "Verification unavailable" },
      { status: 503 },
    );
  }

  const verification =
    (await verificationResponse.json().catch(() => null)) as PaystackVerification | null;
  const valid =
    verificationResponse.ok &&
    verification?.status &&
    verification.data?.status === "success" &&
    verification.data.reference === reference &&
    verification.data.amount === Math.round(Number(attempt.amount) * 100) &&
    verification.data.currency === attempt.currency;

  if (!valid || !verification?.data) {
    return NextResponse.json(
      { error: "Transaction did not pass verification" },
      { status: 422 },
    );
  }

  const { error: settlementError } = await admin.rpc("settle_payment", {
    p_reference: reference,
    p_success: true,
    p_provider_response: verification.data,
  });
  if (settlementError) {
    return NextResponse.json({ error: "Settlement failed" }, { status: 500 });
  }

  // Send email notifications (awaited to ensure delivery before response ends)
  if (attempt?.order_id) {
    await sendOrderEmailsIfPending(attempt.order_id, admin);
  }

  await admin
    .from("payment_webhook_events")
    .update({ completed_at: new Date().toISOString() })
    .eq("event_hash", eventHash);

  return NextResponse.json({ success: true });
}
