"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { requireAdmin } from "@/lib/auth/session"
import { createClient } from "@/lib/supabase/server"

const moderationSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
})

export async function moderateReview(formData: FormData) {
  await requireAdmin()
  const parsed = moderationSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  })
  if (!parsed.success) redirect("/admin/reviews?error=invalid-review")

  const supabase = await createClient()
  const { error } = await supabase
    .from("product_reviews")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id)
  if (error) redirect(`/admin/reviews?error=${encodeURIComponent(error.message)}`)

  revalidatePath("/admin/reviews")
  revalidatePath("/")
  revalidatePath("/shop")
  revalidatePath("/product/[id]", "page")
  redirect(`/admin/reviews?moderated=${parsed.data.status}`)
}
