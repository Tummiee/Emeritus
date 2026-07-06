import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const requested = url.searchParams.get("next")
  const next = requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/account"
  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: profile } = user
        ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
        : { data: null }
      const destination = profile?.role === "admin" || profile?.role === "super_admin"
        ? "/admin"
        : next

      return NextResponse.redirect(new URL(destination, url.origin))
    }
  }
  return NextResponse.redirect(new URL("/auth/login?error=callback", url.origin))
}
