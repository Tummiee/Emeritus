"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { entities, type EntityName } from "@/lib/admin/entities"
import { optimizeAdminImage } from "@/lib/admin/image-optimization"
import { validateAdminImage } from "@/lib/admin/image-upload"
import { requireAdmin } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function entity(value: FormDataEntryValue | null) {
  const name = String(value) as EntityName
  if (!(name in entities)) throw new Error("Unsupported admin entity")
  return { name, config: entities[name] }
}

export async function saveEntity(formData: FormData) {
  const user = await requireAdmin()
  const { name, config } = entity(formData.get("entity"))
  const id = String(formData.get("id") ?? "")
  const values: Record<string, unknown> = {}
  const imageFiles = new Map<string, File>()

  for (const field of config.fields) {
    const raw = formData.get(field.name)
    if (field.type === "image") {
      const file = formData.get(`${field.name}__file`)
      values[field.name] = raw === null || raw === "" ? null : String(raw).trim()
      if (file instanceof File && file.size > 0) {
        const validationError = validateAdminImage(file)
        if (validationError) redirect(`/admin/${name}?error=${validationError}`)
        imageFiles.set(field.name, file)
      }
    } else if (field.type === "boolean") values[field.name] = raw === "on"
    else if (field.type === "number") values[field.name] = raw === null || raw === "" ? null : Number(raw)
    else if (field.type === "json") {
      try { values[field.name] = JSON.parse(String(raw || "{}")) } catch { redirect(`/admin/${name}?error=invalid-json`) }
    } else values[field.name] = raw === null || raw === "" ? null : String(raw).trim()
  }
  const missing = config.fields.some(
    (field) => field.required && (values[field.name] === null || values[field.name] === "") && !imageFiles.has(field.name),
  )
  if (missing) redirect(`/admin/${name}?error=required`)

  const supabase = await createClient()
  const uploaded: Array<{ path: string; assetId: string }> = []
  for (const [fieldName, file] of imageFiles) {
    let optimized
    try {
      optimized = await optimizeAdminImage(file, name === "hero" ? "hero" : "catalog")
    } catch (error) {
      redirect(`/admin/${name}?error=${encodeURIComponent(error instanceof Error ? error.message : "image-processing-failed")}`)
    }
    const path = `${name}/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${optimized.extension}`
    const { error: uploadError } = await supabase.storage
      .from("admin-media")
      .upload(path, optimized.data, { contentType: optimized.contentType, upsert: false })
    if (uploadError) {
      if (uploaded.length) await supabase.storage.from("admin-media").remove(uploaded.map((item) => item.path))
      redirect(`/admin/${name}?error=${encodeURIComponent(uploadError.message)}`)
    }

    const { data: publicUrl } = supabase.storage.from("admin-media").getPublicUrl(path)
    const assetName = String(values.name ?? values.title ?? file.name)
    const altText = String(values.image_alt ?? values.name ?? values.title ?? "")
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
      .single()
    if (assetError) {
      await supabase.storage.from("admin-media").remove([...uploaded.map((item) => item.path), path])
      redirect(`/admin/${name}?error=${encodeURIComponent(assetError.message)}`)
    }
    uploaded.push({ path, assetId: asset.id })
    values[fieldName] = publicUrl.publicUrl
  }

  const result = id ? await supabase.from(config.table).update(values).eq("id", id) : await supabase.from(config.table).insert(values)
  if (result.error) {
    if (uploaded.length) {
      await Promise.all([
        supabase.storage.from("admin-media").remove(uploaded.map((item) => item.path)),
        supabase.from("media_assets").delete().in("id", uploaded.map((item) => item.assetId)),
      ])
    }
    redirect(`/admin/${name}?error=${encodeURIComponent(result.error.message)}`)
  }
  revalidatePath(`/admin/${name}`)
  if (name === "homepage" || name === "hero" || name === "products") revalidatePath("/")
  if (name === "products") revalidatePath("/shop")
  redirect(`/admin/${name}?saved=1`)
}

export async function deleteEntity(formData: FormData) {
  await requireAdmin()
  const { name, config } = entity(formData.get("entity"))
  const id = String(formData.get("id") ?? "")
  const supabase = await createClient()
  await supabase.from(config.table).delete().eq("id", id)
  revalidatePath(`/admin/${name}`)
  if (name === "homepage" || name === "hero" || name === "products") revalidatePath("/")
  if (name === "products") revalidatePath("/shop")
}
