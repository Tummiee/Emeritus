"use client";

import { createClient } from "@/lib/supabase/client";
import { safeNextPath } from "./helpers";

// Preserve the browser OAuth/PKCE flow and Google account chooser.
export async function startGoogleSignIn(next: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback?flow=oauth&next=${encodeURIComponent(safeNextPath(next))}`,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error || !data.url)
    throw new Error("Google sign-in could not be started");
}
