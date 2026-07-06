"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import { Eye, EyeOff, LogIn } from "lucide-react"

import {
  forgotPassword,
  login,
  register,
  resetPassword,
  type AuthState,
} from "@/lib/auth/actions"
import { createClient } from "@/lib/supabase/client"

type Mode = "login" | "register" | "forgot" | "reset"

const copy = {
  login: ["Welcome back", "Sign in to manage your account and orders."],
  register: ["Create your account", "Save favourites, track orders, and request repairs."],
  forgot: ["Reset your password", "We will email you a secure password reset link."],
  reset: ["Choose a new password", "Use a strong password you have not used before."],
} satisfies Record<Mode, [string, string]>

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  error,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  error?: string
}) {
  const [visible, setVisible] = useState(false)
  const password = type === "password"
  return (
    <label className="block space-y-2 text-sm font-medium text-foreground">
      <span>{label}</span>
      <span className="relative block">
        <input
          name={name}
          type={password && visible ? "text" : type}
          autoComplete={autoComplete}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${name}-error` : undefined}
          className="h-11 w-full rounded-xl border border-input bg-background px-3 pr-11 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
        {password && (
          <button
            type="button"
            onClick={() => setVisible((value) => !value)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
      </span>
      {error && <span id={`${name}-error`} className="block text-xs text-destructive">{error}</span>}
    </label>
  )
}

export function AuthForm({ mode, next = "/account" }: { mode: Mode; next?: string }) {
  const action = mode === "login" ? login : mode === "register" ? register : mode === "forgot" ? forgotPassword : resetPassword
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, { status: "idle" })
  const [googleError, setGoogleError] = useState("")
  const [googlePending, setGooglePending] = useState(false)
  const [title, description] = copy[mode]
  const hasPassword = mode !== "forgot"

  async function handleGoogleSignIn() {
    setGoogleError("")
    setGooglePending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          queryParams: {
            prompt: "select_account",
          },
        },
      })

      if (error) {
        setGoogleError(error.message)
        setGooglePending(false)
      }
    } catch (error) {
      setGoogleError(error instanceof Error ? error.message : "Unable to continue with Google.")
      setGooglePending(false)
    }
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg sm:p-8">
      <div className="mb-7">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary">Customer account</p>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>

      {state.message && (
        <div role="status" className={`mb-5 rounded-xl p-3 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {state.message}
        </div>
      )}

      {googleError && (
        <div role="alert" className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {googleError}
        </div>
      )}

      {(mode === "login" || mode === "register") && (
        <>
          <button
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border font-medium transition hover:bg-muted disabled:opacity-50"
            type="button"
            onClick={handleGoogleSignIn}
            disabled={googlePending}
          >
            <LogIn className="size-4" /> {googlePending ? "Redirecting…" : "Continue with Google"}
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">or</div>
        </>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" name="firstName" autoComplete="given-name" error={state.fields?.firstName} />
            <Field label="Last name" name="lastName" autoComplete="family-name" error={state.fields?.lastName} />
          </div>
        )}
        {mode !== "reset" && <Field label="Email address" name="email" type="email" autoComplete="email" error={state.fields?.email} />}
        {hasPassword && <Field label={mode === "reset" ? "New password" : "Password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} error={state.fields?.password} />}
        {(mode === "register" || mode === "reset") && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={state.fields?.confirmPassword} />}

        {mode === "login" && (
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted-foreground">
              <input name="remember" type="checkbox" defaultChecked className="size-4 accent-primary" /> Remember me
            </label>
            <Link href="/auth/forgot-password" className="font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
        )}
        {mode === "register" && (
          <label className="flex items-start gap-2 text-sm text-muted-foreground">
            <input name="terms" type="checkbox" required className="mt-0.5 size-4 accent-primary" />
            <span>I agree to the <Link href="/terms" className="text-primary hover:underline">Terms</Link> and <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
          </label>
        )}
        <button disabled={pending} className="h-11 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
          {pending ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? <>New here? <Link className="font-semibold text-primary" href={`/auth/register?next=${encodeURIComponent(next)}`}>Create an account</Link></> :
         mode === "register" ? <>Already registered? <Link className="font-semibold text-primary" href={`/auth/login?next=${encodeURIComponent(next)}`}>Sign in</Link></> :
         <>Remembered it? <Link className="font-semibold text-primary" href="/auth/login">Back to sign in</Link></>}
      </p>
    </div>
  )
}
