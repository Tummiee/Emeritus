import { NextResponse } from "next/server"

import { safeNextPath, type AuthFlow } from "@/lib/auth/helpers"
import { createClient } from "@/lib/supabase/server"

function failureDestination(flow: AuthFlow) {
  return flow === "recovery"
    ? "/auth/forgot-password?error=recovery-link"
    : "/auth/login?error=confirmation-link"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requestedFlow = url.searchParams.get("flow")
  const flow: AuthFlow = requestedFlow === "recovery" || requestedFlow === "oauth"
    ? requestedFlow
    : "signup"
  const fallback = flow === "recovery" ? "/auth/reset-password" : "/account"
  const next = safeNextPath(url.searchParams.get("next"), fallback)

  if (!code) {
    return NextResponse.redirect(new URL(failureDestination(flow), url.origin))
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error("[Auth] callback exchange failed", {
      flow,
      code: error.code,
      status: error.status,
    })
    return NextResponse.redirect(new URL(failureDestination(flow), url.origin))
  }

  if (flow === "recovery") {
    return NextResponse.redirect(new URL("/auth/reset-password", url.origin))
  }

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null }
  const destination = profile?.role === "admin" || profile?.role === "super_admin"
    ? "/admin"
    : next
  return NextResponse.redirect(new URL(destination, url.origin))
}
