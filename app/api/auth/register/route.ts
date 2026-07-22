import { NextResponse } from "next/server"
import { z } from "zod"

import { authCallbackUrl, classifyAuthError, safeNextPath } from "@/lib/auth/helpers"
import { getSiteUrl } from "@/lib/auth/url"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const parsed = z.object({
    email: z.string().trim().email().max(254),
    password: z.string().min(8).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/),
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    next: z.string().optional(),
  }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid account details." }, { status: 400 })
  }

  const next = safeNextPath(parsed.data.next)
  let supabase
  let callback
  try {
    supabase = await createClient()
    callback = authCallbackUrl(await getSiteUrl(), "signup", next)
  } catch (error) {
    console.error("[Auth] API signup configuration failed", {
      error: error instanceof Error ? error.message : "Unknown configuration error",
    })
    return NextResponse.json({
      error: "Account email service is temporarily unavailable.",
      code: "configuration-error",
    }, { status: 503 })
  }

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
    const kind = classifyAuthError(error)
    console.error("[Auth] API signup failed", { kind, code: error.code, status: error.status })
    const status = kind === "rate-limited" ? 429 : kind === "email-delivery" ? 503 : 400
    return NextResponse.json({
      error: kind === "rate-limited"
        ? "Too many email requests. Wait a few minutes and try again."
        : "Account verification email could not be sent.",
      code: kind,
    }, { status })
  }
  return NextResponse.json({
    user: { id: data.user?.id, email: data.user?.email },
    verificationRequired: !data.session,
    message: data.session
      ? "Account created."
      : "Check your inbox and spam folder to verify your email.",
  }, { status: 201 })
}
