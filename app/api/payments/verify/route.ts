import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { confirmPayment } from "@/lib/payments/service";
import { HttpError, httpError, readJson, rateLimit } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new HttpError("Unauthorized", 401);
    await rateLimit(request, "payment-verify", 30, user.id);
    const parsed = z
      .object({ reference: z.string().trim().min(3).max(160) })
      .safeParse(await readJson(request));
    if (!parsed.success) throw new HttpError("Payment reference required");
    const data = await confirmPayment(parsed.data.reference, user.id);
    return NextResponse.json(
      { success: data.status === "success", data },
      {
        status:
          data.status === "pending"
            ? 202
            : data.status === "needs_reconciliation"
              ? 409
              : data.status === "failed"
                ? 400
                : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    return httpError(error);
  }
}
