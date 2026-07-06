"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { isDeleteAllProductsConfirmed } from "@/lib/admin/bulk-products"
import { requireAdmin } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

function revalidateProductPages() {
  revalidatePath("/")
  revalidatePath("/shop")
  revalidatePath("/admin/products")
  revalidatePath("/admin/inventory")
}

export async function deactivateAllProducts() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("products")
    .update({ active: false, featured: false })
    .eq("active", true)
    .select("id")

  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`)
  revalidateProductPages()
  redirect(`/admin/products?bulk=deactivated&count=${data?.length ?? 0}`)
}

export async function deleteAllProducts(formData: FormData) {
  await requireAdmin()
  if (!isDeleteAllProductsConfirmed(formData.get("confirmation"))) {
    redirect("/admin/products?error=confirmation-required")
  }

  const supabase = await createClient()
  const { data: media } = await supabase
    .from("media_assets")
    .select("path")
    .like("path", "products/%")

  const { data, error } = await supabase.rpc("admin_delete_all_products")
  if (error) redirect(`/admin/products?error=${encodeURIComponent(error.message)}`)

  const paths = media?.map((item) => item.path) ?? []
  if (paths.length) {
    // Database deletion is authoritative; stale storage objects can be cleaned
    // separately if the storage provider is temporarily unavailable.
    await supabase.storage.from("admin-media").remove(paths)
  }

  revalidateProductPages()
  redirect(`/admin/products?bulk=deleted&count=${Number(data ?? 0)}`)
}
