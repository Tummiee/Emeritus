"use server"

import { redirect } from "next/navigation"
import { z } from "zod"

import {
  authCallbackUrl,
  classifyAuthError,
  safeNextPath,
  type AuthErrorKind,
} from "@/lib/auth/helpers"
import { getSiteUrl } from "@/lib/auth/url"
import { createClient } from "@/lib/supabase/server"

export type AuthState = {
  status: "idle" | "error" | "success"
  message?: string
  fields?: Record<string, string>
  code?: AuthErrorKind | "verification-sent" | "recovery-sent"
}

const email = z.string().trim().email("Enter a valid email address").max(254)
const password = z.string().min(8, "Use at least 8 characters").max(128)
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[0-9]/, "Include a number")

function fields(error: z.ZodError) {
  return Object.fromEntries(error.issues.map((issue) => [String(issue.path[0]), issue.message]))
}

function logAuthFailure(operation: string, error: { message?: string; code?: string; status?: number }) {
  console.error("[Auth]", operation, {
    kind: classifyAuthError(error),
    code: error.code,
    status: error.status,
  })
}

function deliveryFailure(kind: AuthErrorKind): AuthState {
  if (kind === "rate-limited") {
    return {
      status: "error",
      code: kind,
      message: "Too many email requests were made. Wait a few minutes and try again.",
    }
  }
  return {
    status: "error",
    code: kind,
    message: "The authentication email could not be sent. Please try again shortly.",
  }
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({
    email,
    password: z.string().min(1, "Enter your password"),
    remember: z.boolean(),
  }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  })
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: fields(parsed.error) }
  }
  const supabase = await createClient({ remember: parsed.data.remember })
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) {
    const kind = classifyAuthError(error)
    if (kind === "email-not-confirmed") {
      return {
        status: "error",
        code: kind,
        message: "Verify your email address before signing in.",
        fields: { email: parsed.data.email },
      }
    }
    return { status: "error", message: "Email or password is incorrect." }
  }
  redirect(safeNextPath(formData.get("next")))
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const schema = z.object({
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    email,
    password,
    confirmPassword: z.string(),
    terms: z.literal(true),
  }).refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  const parsed = schema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    terms: formData.get("terms") === "on",
  })
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: fields(parsed.error) }
  }

  const supabase = await createClient()
  const next = safeNextPath(formData.get("next"))
  const callback = authCallbackUrl(await getSiteUrl(), "signup", next)
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: callback,
      data: {
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
      },
    },
  })
  if (error) {
    logAuthFailure("signup", error)
    return deliveryFailure(classifyAuthError(error))
  }
  if (data.session) redirect(next)
  return {
    status: "success",
    code: "verification-sent",
    message: "Account created. Check your inbox and spam folder to verify your email.",
    fields: { email: parsed.data.email },
  }
}

export async function forgotPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"))
  if (!parsed.success) {
    return { status: "error", fields: { email: parsed.error.issues[0].message } }
  }
  const supabase = await createClient()
  const callback = authCallbackUrl(
    await getSiteUrl(),
    "recovery",
    "/auth/reset-password",
  )
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: callback,
  })
  if (error) {
    logAuthFailure("password-recovery", error)
    const kind = classifyAuthError(error)
    if (kind === "rate-limited" || kind === "email-delivery") return deliveryFailure(kind)
    return {
      status: "error",
      code: kind,
      message: "A reset email could not be requested right now. Please try again shortly.",
    }
  }
  return {
    status: "success",
    code: "recovery-sent",
    message: "If an account exists for that email, a reset link has been requested. Check your inbox and spam folder.",
  }
}

export async function resendVerification(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = email.safeParse(formData.get("email"))
  if (!parsed.success) {
    return { status: "error", fields: { email: parsed.error.issues[0].message } }
  }
  const supabase = await createClient()
  const callback = authCallbackUrl(
    await getSiteUrl(),
    "signup",
    safeNextPath(formData.get("next")),
  )
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: callback },
  })
  if (error) {
    logAuthFailure("resend-verification", error)
    const kind = classifyAuthError(error)
    if (kind === "rate-limited" || kind === "email-delivery") return deliveryFailure(kind)
    return {
      status: "error",
      code: kind,
      message: "A verification email could not be requested right now.",
    }
  }
  return {
    status: "success",
    code: "verification-sent",
    message: "If the account is awaiting verification, a new email is on its way. Check your inbox and spam folder.",
  }
}

export async function resetPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = z.object({
    password,
    confirmPassword: z.string(),
  }).refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  }).safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  })
  if (!parsed.success) {
    return { status: "error", message: "Check the highlighted fields.", fields: fields(parsed.error) }
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      status: "error",
      code: "invalid-link",
      message: "This reset link is invalid or has expired. Request a new one.",
    }
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
  if (error) {
    logAuthFailure("password-update", error)
    return {
      status: "error",
      code: classifyAuthError(error),
      message: "This reset link is invalid or has expired. Request a new one.",
    }
  }
  await supabase.auth.signOut({ scope: "others" })
  redirect("/account/security?password=updated")
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createClient()
  const next = safeNextPath(formData.get("next"))
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: authCallbackUrl(await getSiteUrl(), "oauth", next),
      skipBrowserRedirect: true,
    },
  })
  if (error || !data.url) redirect("/auth/login?error=oauth")
  redirect(data.url)
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}
