"use client"

import { useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, Eye, EyeOff, LogIn, MailCheck } from "lucide-react"

import {
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  type AuthState,
} from "@/lib/auth/actions"
import { createClient } from "@/lib/supabase/client"

type Mode = "login" | "register" | "forgot" | "reset" | "resend"

const copy = {
  login: ["Welcome back", "Sign in to manage your account and orders."],
  register: ["Create your account", "Save favourites, track orders, and request repairs."],
  forgot: ["Reset your password", "We will email you a secure password reset link."],
  reset: ["Choose a new password", "Use a strong password you have not used before."],
  resend: ["Resend verification", "Request a fresh account verification email."],
} satisfies Record<Mode, [string, string]>

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  error,
  defaultValue,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  error?: string
  defaultValue?: string
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
          defaultValue={defaultValue}
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

function SubmitButton({
  pending,
  cooldownActive,
  mode,
}: {
  pending: boolean
  cooldownActive: boolean
  mode: Mode
}) {
  const [cooldown, setCooldown] = useState(() => cooldownActive ? 60 : 0)

  useEffect(() => {
    if (!cooldownActive) return
    const timer = window.setInterval(() => {
      setCooldown((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [cooldownActive])

  const label = mode === "login"
    ? "Sign in"
    : mode === "register"
      ? "Create account"
      : mode === "forgot"
        ? "Send reset link"
        : mode === "resend"
          ? "Resend verification"
          : "Update password"

  return (
    <button disabled={pending || cooldown > 0} className="h-11 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">
      {pending ? "Please wait…" : cooldown > 0 ? `Try again in ${cooldown}s` : label}
    </button>
  )
}

function RegistrationSuccess({ email, next }: { email: string; next: string }) {
  return (
    <div className="w-full max-w-md animate-enter rounded-2xl border border-emerald-100  p-6 text-center shadow-lg sm:p-8" role="status" aria-live="polite">
      <div className="relative mx-auto mb-6 flex size-24 items-center justify-center">
        <span className="absolute inset-0 animate-pulse-soft rounded-full bg-emerald-500/15 motion-reduce:animate-none" />
        <span className="relative flex size-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-950/50">
          <CheckCircle2 className="size-11" strokeWidth={2.25} aria-hidden="true" />
        </span>
      </div>

      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-400">Registration successful</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Your account is ready</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        We sent a verification link to <strong className="font-semibold text-foreground">{email}</strong>. Open the email and verify your address before signing in.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-left text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
        <MailCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p>Check your inbox and spam folder. The verification link can only be used once.</p>
      </div>

      <div className="mt-7 grid gap-3">
        <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90">
          Continue to sign in
        </Link>
        <Link href={`/auth/resend-verification?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`} className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 font-semibold text-foreground hover:bg-muted">
          Resend verification email
        </Link>
      </div>
    </div>
  )
}

export function AuthForm({
  mode,
  next = "/account",
  initialEmail = "",
  notice,
}: {
  mode: Mode
  next?: string
  initialEmail?: string
  notice?: string
}) {
  const action = mode === "login"
    ? login
    : mode === "register"
      ? register
      : mode === "forgot"
        ? forgotPassword
        : mode === "resend"
          ? resendVerification
          : resetPassword
  const [state, formAction, pending] = useActionState<AuthState, FormData>(action, { status: "idle" })
  const [resetState, setResetState] = useState<AuthState>({ status: "idle" })
  const [resetPending, setResetPending] = useState(false)
  const [googleError, setGoogleError] = useState("")
  const [googlePending, setGooglePending] = useState(false)
  const [title, description] = copy[mode]
  const hasPassword = mode === "login" || mode === "register" || mode === "reset"
  const visibleState = mode === "reset" ? resetState : state

  if (mode === "register" && state.status === "success" && state.code === "verification-sent") {
    return <RegistrationSuccess email={state.fields?.email ?? initialEmail} next={next} />
  }

  async function handlePasswordReset(event: React.FormEvent<HTMLFormElement>) {
    if (mode !== "reset") return
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const newPassword = String(formData.get("password") ?? "")
    const confirmation = String(formData.get("confirmPassword") ?? "")
    const fieldErrors: Record<string, string> = {}

    if (newPassword.length < 8) fieldErrors.password = "Use at least 8 characters"
    else if (!/[A-Z]/.test(newPassword)) fieldErrors.password = "Include an uppercase letter"
    else if (!/[a-z]/.test(newPassword)) fieldErrors.password = "Include a lowercase letter"
    else if (!/[0-9]/.test(newPassword)) fieldErrors.password = "Include a number"
    if (newPassword !== confirmation) fieldErrors.confirmPassword = "Passwords do not match"

    if (Object.keys(fieldErrors).length > 0) {
      setResetState({ status: "error", message: "Check the highlighted fields.", fields: fieldErrors })
      return
    }

    setResetPending(true)
    setResetState({ status: "idle" })
    const supabase = createClient()

    try {
      const { data: { user }, error: sessionError } = await supabase.auth.getUser()
      if (sessionError || !user) {
        setResetState({
          status: "error",
          code: "invalid-link",
          message: "This reset link is invalid or has expired. Request a new one.",
        })
        return
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setResetState({
          status: "error",
          message: error.message || "The password could not be updated. Please try again.",
        })
        return
      }

      await supabase.auth.signOut({ scope: "others" })
      window.location.assign("/account/security?password=updated")
    } catch {
      setResetState({ status: "error", message: "The password could not be updated. Please try again." })
    } finally {
      setResetPending(false)
    }
  }

  async function handleGoogleSignIn() {
    setGoogleError("")
    setGooglePending(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?flow=oauth&next=${encodeURIComponent(next)}`,
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

      {visibleState.message && (
        <div role="status" className={`mb-5 rounded-xl p-3 text-sm ${visibleState.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>
          {visibleState.message}
        </div>
      )}

      {notice && !visibleState.message && (
        <div role="status" className="mb-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{notice}</div>
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

      <form action={mode === "reset" ? undefined : formAction} onSubmit={handlePasswordReset} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {mode === "register" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name" name="firstName" autoComplete="given-name" error={state.fields?.firstName} />
            <Field label="Last name" name="lastName" autoComplete="family-name" error={state.fields?.lastName} />
          </div>
        )}
        {mode !== "reset" && <Field label="Email address" name="email" type="email" autoComplete="email" defaultValue={state.fields?.email ?? initialEmail} error={state.code === "email-not-confirmed" ? undefined : state.fields?.email} />}
        {hasPassword && <Field label={mode === "reset" ? "New password" : "Password"} name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} error={visibleState.fields?.password} />}
        {(mode === "register" || mode === "reset") && <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={visibleState.fields?.confirmPassword} />}

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
        <SubmitButton
          key={`${state.code ?? "idle"}:${state.status}`}
          pending={pending || resetPending}
          cooldownActive={state.status === "success" && (state.code === "verification-sent" || state.code === "recovery-sent")}
          mode={mode}
        />
      </form>

      {(state.code === "email-not-confirmed" || state.code === "verification-sent") && (
        <p className="mt-4 text-center text-sm"><Link className="font-semibold text-primary hover:underline" href={`/auth/resend-verification?email=${encodeURIComponent(state.fields?.email ?? initialEmail)}&next=${encodeURIComponent(next)}`}>Resend verification email</Link></p>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {mode === "login" ? <>New here? <Link className="font-semibold text-primary" href={`/auth/register?next=${encodeURIComponent(next)}`}>Create an account</Link></> :
         mode === "register" ? <>Already registered? <Link className="font-semibold text-primary" href={`/auth/login?next=${encodeURIComponent(next)}`}>Sign in</Link></> :
         <>Remembered it? <Link className="font-semibold text-primary" href="/auth/login">Back to sign in</Link></>}
      </p>
    </div>
  )
}
