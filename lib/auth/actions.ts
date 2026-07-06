"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"

export type AuthState = { status: "idle" | "error" | "success"; message?: string; fields?: Record<string, string> }

const email = z.string().trim().email("Enter a valid email address").max(254)
const password = z.string().min(8, "Use at least 8 characters").max(128).regex(/[A-Z]/, "Include an uppercase letter").regex(/[a-z]/, "Include a lowercase letter").regex(/[0-9]/, "Include a number")

function fields(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}
function safeNext(value: FormDataEntryValue | null) {
  const path = typeof value === "string" ? value : ""
  return path.startsWith("/") && !path.startsWith("//") ? path : "/account"
}
async function origin() {
  const values = await headers()
  const host = values.get("x-forwarded-host") ?? values.get("host")
  const protocol = values.get("x-forwarded-proto") ?? (process.env.NODE_ENV === "production" ? "https" : "http")
  if (!host) throw new Error("Request host is unavailable")
  return `${protocol}://${host}`
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ email, password: z.string().min(1, "Enter your password"), remember: z.boolean() }).safeParse({
    email: formData.get("email"), password: formData.get("password"), remember: formData.get("remember") === "on",
  })
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fields: fields(parsed.error) }
  const supabase = await createClient({ remember: parsed.data.remember })
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password })
  if (error) return { status: "error", message: "Email or password is incorrect." }
  redirect(safeNext(formData.get("next")))
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const schema = z.object({ firstName: z.string().trim().min(2).max(60), lastName: z.string().trim().min(2).max(60), email, password, confirmPassword: z.string(), terms: z.literal(true) })
    .refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" })
  const parsed = schema.safeParse({
    firstName: formData.get("firstName"), lastName: formData.get("lastName"), email: formData.get("email"), password: formData.get("password"), confirmPassword: formData.get("confirmPassword"), terms: formData.get("terms") === "on",
  })
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fields: fields(parsed.error) }
  const supabase = await createClient()
  const next = safeNext(formData.get("next"))
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`, data: { first_name: parsed.data.firstName, last_name: parsed.data.lastName } },
  })
  if (error) return { status: "error", message: "We could not create your account. Please try again." }
  if (data.session) redirect(next)
  return { status: "success", message: "Check your email to verify your account." }
}

export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"))
  if (!parsed.success) return { status: "error", fields: { email: parsed.error.issues[0].message } }
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${await origin()}/auth/callback?next=/auth/reset-password` })
  return { status: "success", message: "If an account exists for that email, a reset link is on its way." }
}

export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({ password, confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" }).safeParse({
    password: formData.get("password"), confirmPassword: formData.get("confirmPassword"),
  })
  if (!parsed.success) return { status: "error", message: "Check the highlighted fields.", fields: fields(parsed.error) }
  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) return { status: "error", message: "This reset link is invalid or has expired. Request a new one." }
  await supabase.auth.signOut({ scope: "others" })
  redirect("/account/security?password=updated")
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const next = safeNext(formData.get("next"))
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`, skipBrowserRedirect: true } })
  if (error || !data.url) redirect("/auth/login?error=oauth")
  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
