import { NextResponse } from "next/server";

import { safeNextPath, type AuthFlow } from "@/lib/auth/helpers";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_PASSWORD_AUTH_ENABLED } from "@/lib/auth/policy";

function failureDestination(flow: AuthFlow, next: string) {
  if (flow === "oauth")
    return `/auth/login?error=oauth&next=${encodeURIComponent(next)}`;
  return flow === "recovery"
    ? "/auth/forgot-password?error=recovery-link"
    : "/auth/login?error=confirmation-link";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedFlow = url.searchParams.get("flow");
  if (!EMAIL_PASSWORD_AUTH_ENABLED && requestedFlow !== "oauth") {
    return NextResponse.redirect(
      new URL(
        `/auth/login?notice=google-only&next=${encodeURIComponent(safeNextPath(url.searchParams.get("next")))}`,
        url.origin,
      ),
    );
  }
  const flow: AuthFlow =
    requestedFlow === "recovery" || requestedFlow === "oauth"
      ? requestedFlow
      : "signup";
  const fallback = flow === "recovery" ? "/auth/reset-password" : "/account";
  const next = safeNextPath(url.searchParams.get("next"), fallback);

  if (!code || url.searchParams.has("error")) {
    return NextResponse.redirect(
      new URL(failureDestination(flow, next), url.origin),
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[Auth] callback exchange failed", {
        flow,
        code: error.code,
        status: error.status,
      });
      return NextResponse.redirect(
        new URL(failureDestination(flow, next), url.origin),
      );
    }

    if (flow === "recovery") {
      return NextResponse.redirect(new URL("/auth/reset-password", url.origin));
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.redirect(
        new URL(failureDestination(flow, next), url.origin),
      );
    }
    const { data: profile } = user
      ? await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
      : { data: null };
    const destination =
      profile?.role === "admin" || profile?.role === "super_admin"
        ? "/admin"
        : next;
    return NextResponse.redirect(new URL(destination, url.origin));
  } catch {
    console.error("[Auth] callback could not be completed", { flow });
    return NextResponse.redirect(
      new URL(failureDestination(flow, next), url.origin),
    );
  }
}
