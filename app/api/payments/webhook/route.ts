import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { verifyPaystackWebhookSignature } from "@/lib/payments/paystack";
import { verifyMonnifyWebhookSignature } from "@/lib/payments/monnify";
import { confirmPayment } from "@/lib/payments/service";
import { createAdminClient } from "@/lib/supabase/admin";
import { HttpError, httpError, readText } from "@/lib/http";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const raw = await readText(request, 262144);
    const paystackSignature = request.headers.get("x-paystack-signature");
    const monnifySignature = request.headers.get("monnify-signature");
    const provider = paystackSignature ? "paystack" : "monnify";
    if (
      paystackSignature
        ? !verifyPaystackWebhookSignature(raw, paystackSignature)
        : !monnifySignature ||
          !verifyMonnifyWebhookSignature(raw, monnifySignature)
    )
      throw new HttpError("Invalid signature", 401);
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      throw new HttpError("Invalid payload");
    }
    const parsed = z
      .object({
        event: z.string().max(80).optional(),
        eventType: z.string().max(80).optional(),
        data: z
          .object({ reference: z.string().max(160).optional() })
          .passthrough()
          .optional(),
        eventData: z
          .object({ paymentReference: z.string().max(160).optional() })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .safeParse(payload);
    if (!parsed.success) throw new HttpError("Invalid payload");
    const event = parsed.data;
    const reference =
      provider === "paystack"
        ? event.data?.reference
        : event.eventData?.paymentReference;
    const eventType = provider === "paystack" ? event.event : event.eventType;
    const admin = createAdminClient();
    const eventHash = createHash("sha256")
      .update(provider + raw)
      .digest("hex");
    const { data: previous, error: readError } = await admin
      .from("payment_webhook_events")
      .select("completed_at")
      .eq("event_hash", eventHash)
      .maybeSingle();
    if (readError) throw readError;
    if (previous?.completed_at) return NextResponse.json({ success: true });
    const { error } = await admin.from("payment_webhook_events").upsert(
      {
        event_hash: eventHash,
        provider,
        reference,
        event_type: eventType ?? "unknown",
        payload: event,
      },
      { onConflict: "event_hash", ignoreDuplicates: true },
    );
    if (error) throw error;
    if (
      (eventType === "charge.success" ||
        eventType === "SUCCESSFUL_TRANSACTION") &&
      reference
    ) {
      const { data: attempt, error: attemptError } = await admin
        .from("payment_attempts")
        .select("provider")
        .eq("reference", reference)
        .maybeSingle();
      if (attemptError) throw attemptError;
      if (!attempt || attempt.provider !== provider)
        throw new HttpError("Payment not found", 404);
      const result = await confirmPayment(reference);
      if (result.status === "pending")
        throw new HttpError("Provider confirmation pending", 503);
    }
    const { error: completionError } = await admin
      .from("payment_webhook_events")
      .update({ completed_at: new Date().toISOString() })
      .eq("event_hash", eventHash);
    if (completionError) throw completionError;
    return NextResponse.json({ success: true });
  } catch (error) {
    return httpError(error);
  }
}
