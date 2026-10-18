"use server";

import { revalidatePath } from "@/lib/cache";
import { redirect, unstable_rethrow } from "next/navigation";
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
import { entityDatabaseError, type EntityFormState } from "./entity-form-state";

function entity(value: FormDataEntryValue | null) {
  const name = String(value) as EntityName;
  if (!(name in entities)) throw new Error("Unsupported admin entity");
  return { name, config: entities[name] as EntityConfig };
}

export async function saveEntity(
  previous: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  try {
    return await saveEntityForm(previous, formData);
  } catch (error) {
    unstable_rethrow(error);
    console.error("Admin entity save failed", error);
    return {
      message: `The save could not be confirmed: ${error instanceof Error ? error.message : "the server request failed"}. Check your connection and check the record list before retrying. If it continues, share this message with the site administrator.`,
      fieldErrors: {},
      submission: previous.submission + 1,
    };
  }
}

async function saveEntityForm(
  previous: EntityFormState,
  formData: FormData,
): Promise<EntityFormState> {
  const user = await requireAdmin();
  const { name, config } = entity(formData.get("entity"));
  const id = String(formData.get("id") ?? "");
  const values: Record<string, unknown> = {};
  const imageFiles = new Map<string, File>();
  const fieldErrors: Record<string, string[]> = {};
  const failure = (message: string, errors = fieldErrors): EntityFormState => ({
    message,
    fieldErrors: errors,
    submission: previous.submission + 1,
  });

  for (const field of config.fields) {
    if (id && field.readOnlyWhenEditing) {
      continue;
    }
    const raw = formData.get(field.name);
    if (field.type === "image") {
      const file = formData.get(`${field.name}__file`);
      values[field.name] = String(raw ?? "").trim() || null;
      if (file instanceof File && (file.size > 0 || file.name !== "")) {
        const validationError = validateAdminImage(file);
        if (validationError)
          fieldErrors[field.name] = [
            validationError === "image-too-large"
              ? "Choose an image smaller than 10 MB. Keep all uploads in this form below 11 MB in total."
              : validationError === "unsupported-image-type"
                ? "Choose a JPG, PNG, WebP or GIF image."
                : "This image is empty. Choose a different file.",
          ];
        else imageFiles.set(field.name, file);
      }
    } else if (field.type === "boolean") values[field.name] = raw === "on";
    else if (field.type === "number")
      values[field.name] = raw === null || raw === "" ? null : Number(raw);
    else if (field.type === "json") {
      try {
        values[field.name] = JSON.parse(String(raw || "{}"));
      } catch {
        fieldErrors[field.name] = [
          'Enter valid JSON, for example {"title": "Featured"}. Check double quotes, commas and brackets.',
        ];
      }
    } else values[field.name] = String(raw ?? "").trim() || null;
  }
  for (const field of config.fields) {
    if (id && field.readOnlyWhenEditing) continue;
    if (
      field.required &&
      (values[field.name] == null || values[field.name] === "") &&
      !imageFiles.has(field.name) &&
      !fieldErrors[field.name]
    )
      fieldErrors[field.name] = [`Enter ${field.label.toLowerCase()}.`];
  }

  if (typeof values.code === "string") values.code = values.code.toUpperCase();
  for (const field of config.fields) {
    if (field.type === "datetime" && typeof values[field.name] === "string") {
      const date = new Date(String(values[field.name]) + "+01:00");
      if (!Number.isFinite(date.getTime()))
        fieldErrors[field.name] = [
          "Enter a valid date and time (Nigeria time).",
        ];
      else values[field.name] = date.toISOString();
    }
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
  const supabase = await createClient();
  let existingSlug: string | undefined;
  if (id) {
    const { data: record, error } = await supabase
      .from(config.table)
      .select(
        config.fields.some((field) => field.name === "slug") ? "id,slug" : "id",
      )
      .eq("id", id)
      .maybeSingle();
    if (error)
      return failure(
        `Could not load the record for editing. ${entityDatabaseError(error, config).message}`,
      );
    if (!record)
      return failure(
        "This record no longer exists. Return to the list and refresh before editing.",
      );
    if ("slug" in record && typeof record.slug === "string")
      existingSlug = record.slug;
  }
  const validated = validateEntityValues(
    {
      ...config,
      fields: config.fields.filter((field) => !imageFiles.has(field.name)),
    },
    values,
    Boolean(id),
    existingSlug,
  );
  if (!validated.success) {
    for (const issue of validated.error.issues) {
      const key = String(issue.path[0] ?? "");
      if (!fieldErrors[key]) fieldErrors[key] = [issue.message];
    }
  }
  if (Object.keys(fieldErrors).length)
    return failure("Correct the highlighted fields and save again.");
  // Persist the same trimmed and validated values checked above.
  Object.assign(values, validated.success ? validated.data : {});
  const uploaded: Array<{ path: string; assetId: string }> = [];
  for (const [fieldName, file] of imageFiles) {
    let optimized;
    try {
      optimized = await optimizeAdminImage(
        file,
        name === "hero" ? "hero" : "catalog",
      );
    } catch (error) {
      if (uploaded.length)
        await supabase.storage
          .from("admin-media")
          .remove(uploaded.map((item) => item.path));
      return failure(
        `Could not process ${config.fields.find((field) => field.name === fieldName)?.label ?? "image"}. Choose another image and try again.`,
        {
          [fieldName]: [
            `The image could not be processed: ${error instanceof Error ? error.message : "unsupported or damaged image"}. Choose another JPG, PNG, WebP or GIF file.`,
          ],
        },
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
      return failure(
        "The image could not be uploaded. Check your connection and storage permissions, then select the file again.",
        {
          [fieldName]: [
            `Upload failed: ${uploadError.message}. Select the image again and retry.`,
          ],
        },
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
      return failure(
        `The uploaded image could not be registered. ${entityDatabaseError(assetError, config).message}`,
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
    const problem = entityDatabaseError(result.error, config);
    return failure(problem.message, problem.fieldErrors);
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
