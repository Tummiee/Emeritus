"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { imageExtension, validateAdminImage } from "@/lib/admin/image-upload"
import { requireAdmin } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"
import { isValidSalePrice } from "@/lib/commerce/promotions"

function fail(message: string): never {
  redirect(`/admin/offers?error=${encodeURIComponent(message)}`)
}

function optionalDate(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim()
  if (!raw) return null
  const date = new Date(raw)
  if (Number.isNaN(date.getTime())) fail("Enter valid campaign dates.")
  return date.toISOString()
}

export async function savePromotion(formData: FormData) {
  const user = await requireAdmin()
  const supabase = await createClient()
  const id = String(formData.get("id") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const headline = String(formData.get("headline") ?? "").trim()
  const startsAt = optionalDate(formData.get("starts_at"))
  const endsAt = optionalDate(formData.get("ends_at"))
  const selectedIds = formData.getAll("product_ids").map(String)

  if (!name || !headline) fail("Name and headline are required.")
  if (!selectedIds.length) fail("Select at least one product.")
  if (startsAt && endsAt && new Date(endsAt) <= new Date(startsAt)) {
    fail("The end date must be after the start date.")
  }

  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,price,active")
    .in("id", selectedIds)
  if (productError || products?.length !== selectedIds.length) fail("One or more selected products no longer exist.")
  if (products.some((product) => !product.active)) fail("Only active products can be added to an offer.")

  const relations = products.map((product, index) => {
    const raw = String(formData.get(`sale_price:${product.id}`) ?? "").trim()
    const salePrice = raw ? Number(raw) : null
    if (!isValidSalePrice(salePrice, Number(product.price))) {
      fail("Every offer price must be lower than its regular product price.")
    }
    return {
      product_id: product.id,
      sale_price: salePrice,
      display_order: index,
    }
  })

  let imageUrl = String(formData.get("image_url") ?? "").trim() || null
  const image = formData.get("image_url__file")
  if (image instanceof File && image.size > 0) {
    const validationError = validateAdminImage(image)
    if (validationError) fail(validationError)
    const path = `promotions/${new Date().getUTCFullYear()}/${crypto.randomUUID()}.${imageExtension(image.type)}`
    const { error: uploadError } = await supabase.storage
      .from("admin-media")
      .upload(path, image, { contentType: image.type, upsert: false })
    if (uploadError) fail(uploadError.message)
    imageUrl = supabase.storage.from("admin-media").getPublicUrl(path).data.publicUrl
    await supabase.from("media_assets").insert({
      name,
      alt_text: String(formData.get("image_alt") ?? "").trim(),
      path,
      mime_type: image.type,
      size_bytes: image.size,
      uploaded_by: user.id,
    })
  }

  const values = {
    name,
    promotion_type: String(formData.get("promotion_type") ?? "flash_sale"),
    eyebrow: String(formData.get("eyebrow") ?? "").trim(),
    headline,
    description: String(formData.get("description") ?? "").trim(),
    image_url: imageUrl,
    image_alt: String(formData.get("image_alt") ?? "").trim(),
    starts_at: startsAt,
    ends_at: endsAt,
    coupon_id: String(formData.get("coupon_id") ?? "").trim() || null,
    active: formData.get("active") === "on",
    display_order: Number(formData.get("display_order") ?? 0) || 0,
  }

  const promotionResult = id
    ? await supabase.from("promotions").update(values).eq("id", id).select("id").single()
    : await supabase.from("promotions").insert(values).select("id").single()
  if (promotionResult.error) fail(promotionResult.error.message)

  const promotionId = promotionResult.data.id
  if (id) {
    const { error } = await supabase.from("promotion_products").delete().eq("promotion_id", promotionId)
    if (error) fail(error.message)
  }
  const { error: relationError } = await supabase
    .from("promotion_products")
    .insert(relations.map((relation) => ({ ...relation, promotion_id: promotionId })))
  if (relationError) fail(relationError.message)

  revalidatePath("/")
  revalidatePath("/admin/offers")
  redirect("/admin/offers?saved=1")
}

export async function deletePromotion(formData: FormData) {
  await requireAdmin()
  const supabase = await createClient()
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase.from("promotions").delete().eq("id", id)
  if (error) fail(error.message)
  revalidatePath("/")
  revalidatePath("/admin/offers")
  redirect("/admin/offers?deleted=1")
}
