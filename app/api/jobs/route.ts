import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { reconcilePayment } from "@/lib/payments/service";
import {
  sendCustomerConfirmation,
  sendAdminNotification,
} from "@/lib/sendEmail";
import { HttpError, httpError } from "@/lib/http";

export const maxDuration = 300;
export async function GET(request: Request) {
  try {
    const supplied = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
    if (
      !process.env.CRON_SECRET ||
      supplied.length !== expected.length ||
      !timingSafeEqual(supplied, expected)
    )
      throw new HttpError("Unauthorized", 401);
    const admin = createAdminClient();
    const { data: attempts, error } = await admin
      .from("payment_attempts")
      .select("reference")
      .eq("status", "pending")
      .lt("expires_at", new Date().toISOString())
      .lt("next_reconcile_at", new Date().toISOString())
      .order("next_reconcile_at")
      .limit(10);
    if (error) throw error;
    const results = await Promise.allSettled(
      (attempts ?? []).map(async ({ reference }) => {
        try {
          return await reconcilePayment(reference);
        } finally {
          const { error: deferError } = await admin
            .from("payment_attempts")
            .update({
              next_reconcile_at: new Date(Date.now() + 300000).toISOString(),
            })
            .eq("reference", reference);
          if (deferError) throw deferError;
        }
      }),
    );
    const { data: jobs, error: jobError } = await admin.rpc("claim_email_jobs");
    if (jobError) throw jobError;
    // Bound concurrency; SMTP work must not exhaust connections or webhook timeouts.
    for (const job of jobs ?? []) {
      try {
        if (
          !process.env.SMTP_HOST ||
          !process.env.SMTP_USER ||
          !process.env.SMTP_PASS
        )
          throw new Error("SMTP unavailable");
        if (job.recipient === "admin" && !process.env.ADMIN_ORDER_EMAIL)
          throw new Error("Admin recipient unavailable");
        const { data: order, error: orderError } = await admin
          .from("orders")
          .select("*,order_items(*)")
          .eq("id", job.order_id)
          .single();
        if (orderError) throw orderError;
        const {
          data: { user },
          error: userError,
        } = await admin.auth.admin.getUserById(order.user_id);
        if (userError || !user?.email) throw new Error("Customer unavailable");
        const data = {
          ...order,
          email: user.email,
          customer_name:
            [order.shipping_address.firstName, order.shipping_address.lastName]
              .filter(Boolean)
              .join(" ") || "Customer",
        };
        if (job.recipient === "customer") await sendCustomerConfirmation(data);
        else await sendAdminNotification(data);
        const { error: saveError } = await admin
          .from("email_outbox")
          .update({
            delivered_at: new Date().toISOString(),
            claimed_until: null,
            last_error: null,
          })
          .eq("id", job.id);
        if (saveError) throw saveError;
      } catch (error) {
        console.error("[Jobs] email delivery failed", {
          jobId: job.id,
          error: error instanceof Error ? error.message : "unknown",
        });
        const { error: saveError } = await admin
          .from("email_outbox")
          .update({
            claimed_until: null,
            last_error:
              error instanceof Error ? error.message : "Delivery failed",
            available_at: new Date(
              Date.now() +
                Math.min(86400, 60 * 2 ** Math.min(job.attempts, 10)) * 1000,
            ).toISOString(),
          })
          .eq("id", job.id);
        if (saveError) throw saveError;
      }
    }
    const { error: cleanupError } = await admin
      .from("request_limits")
      .delete()
      .lt("window_start", new Date(Date.now() - 86400000).toISOString());
    if (cleanupError) throw cleanupError;
    return NextResponse.json(
      {
        processedPayments: results.length,
        failedPayments: results.filter((result) => result.status === "rejected")
          .length,
        emailJobs: jobs?.length ?? 0,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return httpError(error);
  }
}
