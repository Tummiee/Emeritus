import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return error ? null : user
})

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/auth/login?next=/account")
  return user
}

export async function requireAdmin() {
  const user = await requireUser()
  const supabase = await createClient()
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (data?.role !== "admin" && data?.role !== "super_admin") redirect("/account")
  return user
}
