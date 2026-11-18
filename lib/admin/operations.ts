"use server";

import { revalidatePath } from "@/lib/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { optimizeAdminImage } from "@/lib/admin/image-optimization";
import { validateAdminImage } from "@/lib/admin/image-upload";
import { generateReportData } from "@/lib/admin/report-generation";
import { reportRequestSchema } from "@/lib/admin/reports";
import { requireAdmin } from "@/lib/auth/session";
import {
  isPaymentProvider,
  paymentProviderIsConfigured,
} from "@/lib/payments/provider";
import { NIGERIAN_STATES } from "@/lib/shipping/nigeria";
import { createClient } from "@/lib/supabase/server";
import { loadPayment, inspectPayment, settle } from "@/lib/payments/service";

export type CustomerUpdateState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function resolvePaymentReview(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      reference: z.string().min(3).max(160),
      note: z.string().trim().min(20).max(1000),
    })
    .safeParse({
      reference: formData.get("reference"),
      note: formData.get("note"),
    });
  if (!parsed.success)
    redirect("/admin/payments?error=review-evidence-required");
  const { error } = await (
    await createClient()
  ).rpc("resolve_payment_review", {
    p_reference: parsed.data.reference,
    p_note: parsed.data.note,
  });
  if (error) redirect("/admin/payments?error=review-not-saved");
  revalidatePath("/admin/payments");
}

export async function updateInventory(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      productId: z.string().uuid(),
      quantity: z.coerce.number().int().min(0),
      threshold: z.coerce.number().int().min(0),
    })
    .safeParse({
      productId: formData.get("productId"),
      quantity: formData.get("quantity"),
      threshold: formData.get("threshold"),
    });
  if (!parsed.success) redirect("/admin/inventory?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_inventory", {
    p_product_id: parsed.data.productId,
    p_quantity: parsed.data.quantity,
    p_threshold: parsed.data.threshold,
  });
  if (error) redirect("/admin/inventory?error=save-failed");
  revalidatePath("/admin/inventory");
}

export async function updateOrder(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      status: z.enum([
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
      ]),
    })
    .safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) redirect("/admin/orders?error=invalid-status");
  const supabase = await createClient();
  if (parsed.data.status === "cancelled") {
    const { data: attempt, error: readError } = await supabase
      .from("payment_attempts")
      .select("reference")
      .eq("order_id", parsed.data.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) redirect("/admin/orders?error=payment-unavailable");
    if (attempt) {
      try {
        const { attempt: trusted } = await loadPayment(attempt.reference);
        const verified = await inspectPayment(trusted);
        if (verified.state === "successful")
          await settle(attempt.reference, true, verified.raw);
        else if (verified.state === "terminal" || verified.safeToExpire)
          await settle(attempt.reference, false, verified.raw);
        else throw new Error("Payment is processing");
      } catch {
        redirect("/admin/orders?error=payment-requires-review");
      }
    }
  }
  const { error } = await supabase.rpc("admin_transition_order", {
    p_id: parsed.data.id,
    p_status: parsed.data.status,
    p_refund_reference: String(formData.get("refundReference") || ""),
  });
  if (error) {
    redirect("/admin/orders?error=status-not-saved");
  }
  revalidatePath("/admin/orders");
  revalidatePath("/account/orders");
  redirect("/admin/orders?updated=status");
}

export async function updateCustomer(
  _: CustomerUpdateState,
  formData: FormData,
): Promise<CustomerUpdateState> {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid(),
      firstName: z.string().trim().max(60),
      lastName: z.string().trim().max(60),
      phone: z.string().trim().max(30),
    })
    .safeParse({
      id: formData.get("id"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      phone: formData.get("phone"),
    });
  if (!parsed.success)
    return { status: "error", message: "Enter valid customer details." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_update_customer_profile", {
    p_customer_id: parsed.data.id,
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_phone: parsed.data.phone,
  });
  if (error)
    return {
      status: "error",
      message: "Customer details could not be updated.",
    };
  revalidatePath("/admin/customers");
  revalidatePath("/account", "layout");
  return { status: "success", message: "Customer contact details updated." };
}

export async function saveSetting(formData: FormData) {
  const user = await requireAdmin();
  const key = z.string().min(1).max(100).parse(formData.get("key"));
  if (key === "payment_provider") redirect("/admin/payments");
  const label = z.string().min(1).max(120).parse(formData.get("label"));
  const group = z.string().min(1).max(80).parse(formData.get("group"));
  const raw = String(formData.get("value") ?? "");
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = raw;
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_settings")
    .upsert({ key, label, group_name: group, value, updated_by: user.id });
  if (error) redirect("/admin/settings?error=save-failed");
  revalidatePath("/admin/settings");
}

export async function deleteSetting(formData: FormData) {
  await requireAdmin();
  const key = String(formData.get("key"));
  if (key === "payment_provider") redirect("/admin/payments");
  const supabase = await createClient();
  const { error } = await supabase
    .from("store_settings")
    .delete()
    .eq("key", key);
  if (error) redirect("/admin/settings?error=save-failed");
  revalidatePath("/admin/settings");
}

export async function updatePaymentProvider(formData: FormData) {
  const user = await requireAdmin();
  const provider = formData.get("provider");
  if (!isPaymentProvider(provider))
    redirect("/admin/payments?error=invalid-provider");
  if (!paymentProviderIsConfigured(provider))
    redirect(`/admin/payments?error=${provider}-not-configured`);

  const supabase = await createClient();
  const { error } = await supabase.from("store_settings").upsert({
    key: "payment_provider",
    value: provider,
    label: "Active payment provider",
    group_name: "payments",
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });
  if (error) redirect("/admin/payments?error=save-failed");

  revalidatePath("/admin/payments");
  revalidatePath("/checkout");
  redirect(`/admin/payments?updated=${provider}`);
}

export async function saveTaxRule(formData: FormData) {
  const user = await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(80),
      rate: z.coerce.number().min(0).max(100),
      country: z
        .string()
        .trim()
        .length(2)
        .transform((value) => value.toUpperCase()),
      appliesTo: z.string().trim().min(1).max(200),
      active: z.boolean(),
    })
    .safeParse({
      id: String(formData.get("id") || "") || undefined,
      name: formData.get("name"),
      rate: formData.get("rate"),
      country: formData.get("country"),
      appliesTo: formData.get("appliesTo"),
      active: formData.get("active") === "on",
    });
  if (!parsed.success) redirect("/admin/tax?error=invalid");
  const supabase = await createClient();
  const values = {
    name: parsed.data.name,
    rate: parsed.data.rate,
    country_code: parsed.data.country,
    applies_to: parsed.data.appliesTo,
    active: parsed.data.active,
    updated_by: user.id,
  };
  const result = parsed.data.id
    ? await supabase.from("tax_rules").update(values).eq("id", parsed.data.id)
    : await supabase.from("tax_rules").insert(values);
  if (result.error)
    redirect(`/admin/tax?error=${encodeURIComponent(result.error.message)}`);
  revalidatePath("/admin/tax");
  revalidatePath("/cart");
  redirect("/admin/tax?saved=1");
}

export async function saveShippingZone(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(80),
      baseFee: z.coerce.number().min(0).max(100_000_000),
      freeThreshold: z.preprocess(
        (value) => (value === "" ? null : value),
        z.coerce.number().min(0).max(1_000_000_000).nullable(),
      ),
      minimumDays: z.coerce.number().int().min(1).max(90),
      maximumDays: z.coerce.number().int().min(1).max(90),
      fallback: z.boolean(),
      active: z.boolean(),
      states: z.array(z.enum(NIGERIAN_STATES)),
    })
    .refine((value) => value.maximumDays >= value.minimumDays, {
      path: ["maximumDays"],
    })
    .refine((value) => value.fallback || value.states.length > 0, {
      path: ["states"],
    })
    .safeParse({
      id: String(formData.get("id") || "") || undefined,
      name: formData.get("name"),
      baseFee: formData.get("baseFee"),
      freeThreshold: formData.get("freeThreshold"),
      minimumDays: formData.get("minimumDays"),
      maximumDays: formData.get("maximumDays"),
      fallback: formData.get("fallback") === "on",
      active: formData.get("active") === "on",
      states: formData.getAll("states"),
    });
  if (!parsed.success) redirect("/admin/shipping?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.rpc("save_shipping_zone", {
    p_id: parsed.data.id ?? null,
    p_name: parsed.data.name,
    p_base_fee: parsed.data.baseFee,
    p_free_shipping_threshold: parsed.data.freeThreshold,
    p_estimated_days_min: parsed.data.minimumDays,
    p_estimated_days_max: parsed.data.maximumDays,
    p_is_fallback: parsed.data.fallback,
    p_active: parsed.data.active,
    p_states: parsed.data.states,
  });
  if (error)
    redirect(`/admin/shipping?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shipping");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/admin/shipping?saved=1");
}

export async function deleteShippingZone(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/shipping?error=invalid");
  const supabase = await createClient();
  const { error } = await supabase
    .from("shipping_zones")
    .delete()
    .eq("id", id.data);
  if (error)
    redirect(`/admin/shipping?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/shipping");
  revalidatePath("/cart");
  revalidatePath("/checkout");
  redirect("/admin/shipping?deleted=1");
}

export async function uploadMedia(formData: FormData) {
  const user = await requireAdmin();
  const file = formData.get("file");
  if (!(file instanceof File) || validateAdminImage(file))
    redirect("/admin/media?error=invalid");
  let optimized;
  try {
    optimized = await optimizeAdminImage(file, "media");
  } catch (error) {
    redirect(
      `/admin/media?error=${encodeURIComponent(error instanceof Error ? error.message : "image-processing-failed")}`,
    );
  }
  const supabase = await createClient();
  const path = `${new Date().getUTCFullYear()}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage
    .from("admin-media")
    .upload(path, optimized.data, { contentType: optimized.contentType });
  if (error)
    redirect(`/admin/media?error=${encodeURIComponent(error.message)}`);
  const { error: assetError } = await supabase.from("media_assets").insert({
    name: String(formData.get("name") || file.name),
    alt_text: String(formData.get("alt") || ""),
    path,
    mime_type: optimized.contentType,
    size_bytes: optimized.size,
    uploaded_by: user.id,
  });
  if (assetError) {
    await supabase.storage.from("admin-media").remove([path]);
    redirect(`/admin/media?error=${encodeURIComponent(assetError.message)}`);
  }
  revalidatePath("/admin/media");
}

export async function deleteMedia(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { data: asset, error: readError } = await supabase
    .from("media_assets")
    .select("path")
    .eq("id", id)
    .single();
  if (readError) redirect("/admin/media?error=asset-unavailable");
  const { error } = await supabase.from("media_assets").delete().eq("id", id);
  if (error) redirect("/admin/media?error=asset-is-referenced");
  const { error: storageError } = await supabase.storage
    .from("admin-media")
    .remove([asset.path]);
  if (storageError) redirect("/admin/media?error=storage-cleanup-required");
  revalidatePath("/admin/media");
}

export async function generateReport(formData: FormData) {
  const user = await requireAdmin();
  const parsed = reportRequestSchema.safeParse({
    type: formData.get("type"),
    start: formData.get("start"),
    end: formData.get("end"),
  });
  if (!parsed.success)
    redirect(
      `/admin/reports?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid report request")}`,
    );
  const supabase = await createClient();
  let data;
  try {
    data = await generateReportData(
      supabase,
      parsed.data.type,
      parsed.data.start,
      parsed.data.end,
    );
  } catch (error) {
    redirect(
      `/admin/reports?error=${encodeURIComponent(error instanceof Error ? error.message : "Report generation failed")}`,
    );
  }
  const label =
    parsed.data.type === "inventory"
      ? `inventory snapshot ${parsed.data.end}`
      : `${parsed.data.type} ${parsed.data.start} – ${parsed.data.end}`;
  const { error } = await supabase.from("generated_reports").insert({
    name: label,
    report_type: parsed.data.type,
    period_start: parsed.data.start,
    period_end: parsed.data.end,
    data,
    generated_by: user.id,
  });
  if (error)
    redirect(`/admin/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/reports");
  redirect("/admin/reports?generated=1");
}

export async function deleteReport(formData: FormData) {
  await requireAdmin();
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/reports?error=Invalid%20report");
  const supabase = await createClient();
  const { error } = await supabase
    .from("generated_reports")
    .delete()
    .eq("id", id.data);
  if (error)
    redirect(`/admin/reports?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/reports");
  redirect("/admin/reports?deleted=1");
}
