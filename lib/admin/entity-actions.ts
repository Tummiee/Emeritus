"use server";

import { revalidatePath } from "@/lib/cache";
import { redirect } from "next/navigation";
import {
  entities,
  type EntityConfig,
  type EntityName,
} from "@/lib/admin/entities";
import { optimizeAdminImage } from "@/lib/admin/image-optimization";
import { validateAdminImage } from "@/lib/admin/image-upload";
import { validateEntityValues } from "@/lib/admin/entity-validation";
import { requireAdmin } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

function entity(value: FormDataEntryValue | null) {
  const name = String(value) as EntityName;
  if (!(name in entities)) throw new Error("Unsupported admin entity");
  return { name, config: entities[name] as EntityConfig };
}

export async function saveEntity(formData: FormData) {
  const user = await requireAdmin();
  const { name, config } = entity(formData.get("entity"));
  const id = String(formData.get("id") ?? "");
  const values: Record<string, unknown> = {};
  const imageFiles = new Map<string, File>();

  for (const field of config.fields) {
    if (id && field.readOnlyWhenEditing) {
      continue;
    }
    const raw = formData.get(field.name);
    if (field.type === "image") {
      const file = formData.get(`${field.name}__file`);
      values[field.name] =
        raw === null || raw === "" ? null : String(raw).trim();
      if (file instanceof File && file.size > 0) {
        const validationError = validateAdminImage(file);
        if (validationError)
          redirect(`/admin/${name}?error=${validationError}`);
        imageFiles.set(field.name, file);
      }
    } else if (field.type === "boolean") values[field.name] = raw === "on";
    else if (field.type === "number")
      values[field.name] = raw === null || raw === "" ? null : Number(raw);
    else if (field.type === "json") {
      try {
        values[field.name] = JSON.parse(String(raw || "{}"));
      } catch {
        redirect(`/admin/${name}?error=invalid-json`);
      }
    } else
      values[field.name] =
        raw === null || raw === "" ? null : String(raw).trim();
  }
  const missing = config.fields.some((field) => {
    if (id && field.readOnlyWhenEditing) return false;
    return (
      field.required &&
      (values[field.name] === null || values[field.name] === "") &&
      !imageFiles.has(field.name)
    );
  });
  if (missing) redirect(`/admin/${name}?error=required`);

  if (typeof values.code === "string") values.code = values.code.toUpperCase();
  for (const field of config.fields) {
    if (field.type === "datetime" && typeof values[field.name] === "string")
      values[field.name] = new Date(
        String(values[field.name]) + "+01:00",
      ).toISOString();
  }
  for (const field of config.fields) {
    if (field.name === "display_order" || field.name === "minimum_amount")
      values[field.name] ??= 0;
    if (
      [
        "description",
        "subtitle",
        "image_alt",
        "cta_label",
        "cta_href",
      ].includes(field.name)
    )
      values[field.name] ??= "";
  }
  const validated = validateEntityValues(
    {
      ...config,
      fields: config.fields.filter((field) => !imageFiles.has(field.name)),
    },
    values,
    Boolean(id),
  );
  if (!validated.success)
    redirect(
      `/admin/${name}?error=${encodeURIComponent(validated.error.issues[0]?.message || "Invalid input")}`,
    );
  const supabase = await createClient();
  const uploaded: Array<{ path: string; assetId: string }> = [];
  for (const [fieldName, file] of imageFiles) {
    let optimized;
    try {
      optimized = await optimizeAdminImage(
        file,
        name === "hero" ? "hero" : "catalog",
      );
    } catch (error) {
      redirect(
        `/admin/${name}?error=${encodeURIComponent(error instanceof Error ? error.message : "image-processing-failed")}`,
      );
    }
    const path = `${name}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${optimized.extension}`;
    const { error: uploadError } = await supabase.storage
      .from("admin-media")
      .upload(path, optimized.data, {
        contentType: optimized.contentType,
        upsert: false,
      });
    if (uploadError) {
      if (uploaded.length)
        await supabase.storage
          .from("admin-media")
          .remove(uploaded.map((item) => item.path));
      redirect(
        `/admin/${name}?error=${encodeURIComponent(uploadError.message)}`,
      );
    }

    const { data: publicUrl } = supabase.storage
      .from("admin-media")
      .getPublicUrl(path);
    const assetName = String(values.name ?? values.title ?? file.name);
    const altText = String(
      values.image_alt ?? values.name ?? values.title ?? "",
    );
    const { data: asset, error: assetError } = await supabase
      .from("media_assets")
      .insert({
        name: assetName,
        alt_text: altText,
        path,
        mime_type: optimized.contentType,
        size_bytes: optimized.size,
        uploaded_by: user.id,
      })
      .select("id")
      .single();
    if (assetError) {
      await supabase.storage
        .from("admin-media")
        .remove([...uploaded.map((item) => item.path), path]);
      redirect(
        `/admin/${name}?error=${encodeURIComponent(assetError.message)}`,
      );
    }
    uploaded.push({ path, assetId: asset.id });
    values[fieldName] = publicUrl.publicUrl;
  }

  const result =
    name === "products"
      ? await supabase.rpc("admin_save_product", {
          p_id: id || null,
          p_values: values,
        })
      : id
        ? await supabase.from(config.table).update(values).eq("id", id)
        : await supabase.from(config.table).insert(values);
  if (result.error) {
    if (uploaded.length) {
      await Promise.all([
        supabase.storage
          .from("admin-media")
          .remove(uploaded.map((item) => item.path)),
        supabase
          .from("media_assets")
          .delete()
          .in(
            "id",
            uploaded.map((item) => item.assetId),
          ),
      ]);
    }
    redirect(
      `/admin/${name}?error=${encodeURIComponent(result.error.message)}`,
    );
  }
  revalidatePath(`/admin/${name}`);
  if (name === "homepage" || name === "hero" || name === "products")
    revalidatePath("/");
  if (name === "products") revalidatePath("/shop");
  redirect(`/admin/${name}?saved=1`);
}

export async function deleteEntity(formData: FormData) {
  await requireAdmin();
  const { name, config } = entity(formData.get("entity"));
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const { error } =
    name === "products"
      ? await supabase
          .from("products")
          .update({ active: false, featured: false })
          .eq("id", id)
      : await supabase.from(config.table).delete().eq("id", id);
  if (error)
    redirect(`/admin/${name}?error=${encodeURIComponent(error.message)}`);
  revalidatePath(`/admin/${name}`);
  if (name === "homepage" || name === "hero" || name === "products")
    revalidatePath("/");
  if (name === "products") revalidatePath("/shop");
}
