"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { startGoogleSignIn } from "@/lib/auth/google";

export function GoogleSignIn({
  next = "/account",
  notice,
}: {
  next?: string;
  notice?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const starting = useRef(false);

  async function handleSignIn() {
    if (starting.current) return;
    starting.current = true;
    setPending(true);
    setError("");
    try {
      await startGoogleSignIn(next);
    } catch {
      setError("Google sign-in could not be started. Please try again.");
      setPending(false);
      starting.current = false;
    }
  }

  return (
    <section
      className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8"
      aria-labelledby="google-sign-in-title"
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-primary text-center">
        Customer account
      </p>
      <h1
        id="google-sign-in-title"
        className="text-3xl font-bold tracking-tight"
      >
        Sign in to your account
      </h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Continue with Google to access your orders, favourites, and repairs.
      </p>
      {notice && !error && (
        <p
          role="status"
          className="mt-5 rounded-xl bg-muted p-3 text-center text-sm text-foreground"
        >
          {notice}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="mt-5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleSignIn}
        disabled={pending}
        aria-busy={pending}
        className="mt-7 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? (
          <LoaderCircle
            className="size-5 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ) : (
          <GoogleMark />
        )}
        {pending ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="mt-5 text-center text-sm leading-6 text-muted-foreground">
        New here? Your account is created when you continue with Google.
      </p>
      <p className="mt-7 border-t border-border pt-5 text-center text-xs leading-6 text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link
          href="/terms"
          className="font-medium text-primary underline underline-offset-4"
        >
          Terms
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </section>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.36Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A10 10 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.92a6 6 0 0 1 0-3.84V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.59Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.96c1.47 0 2.79.51 3.83 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.49l3.34 2.59C7.2 7.72 9.4 5.96 12 5.96Z"
      />
    </svg>
  );
}
