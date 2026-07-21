export type AuthFlow = "signup" | "recovery" | "oauth"

export type AuthErrorKind =
  | "email-not-confirmed"
  | "rate-limited"
  | "email-delivery"
  | "signup-disabled"
  | "already-registered"
  | "invalid-link"
  | "unknown"

export function safeNextPath(value: unknown, fallback = "/account") {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : fallback
}

export function resolveSiteUrl(input: {
  siteUrl?: string
  appUrl?: string
  forwardedHost?: string
  host?: string
  forwardedProtocol?: string
  nodeEnv?: string
}) {
  const configured = input.siteUrl?.trim() || input.appUrl?.trim()
  let value = configured
  if (!value) {
    const host = input.forwardedHost?.trim() || input.host?.trim()
    if (!host) {
      if (input.nodeEnv === "production") throw new Error("Application URL is not configured")
      return "http://localhost:3000"
    }
    const protocol = input.forwardedProtocol?.trim()
      || (input.nodeEnv === "production" ? "https" : "http")
    value = `${protocol}://${host}`
  }
  const url = new URL(value)
  if (input.nodeEnv === "production" && url.protocol !== "https:") {
    throw new Error("Production application URL must use HTTPS")
  }
  return url.origin
}

export function authCallbackUrl(origin: string, flow: AuthFlow, next: string) {
  const url = new URL("/auth/callback", origin)
  url.searchParams.set("flow", flow)
  url.searchParams.set("next", safeNextPath(next))
  return url.toString()
}

export function classifyAuthError(error: {
  message?: string
  code?: string
  status?: number
} | null | undefined): AuthErrorKind {
  const value = `${error?.code ?? ""} ${error?.message ?? ""}`.toLowerCase()
  if (error?.status === 429 || value.includes("rate limit") || value.includes("too many")) return "rate-limited"
  if (value.includes("email not confirmed")) return "email-not-confirmed"
  if (value.includes("already registered") || value.includes("already been registered")) return "already-registered"
  if (value.includes("signup") && value.includes("disabled")) return "signup-disabled"
  if (
    value.includes("smtp")
    || value.includes("email address not authorized")
    || value.includes("sending confirmation email")
    || value.includes("error sending")
  ) return "email-delivery"
  if (value.includes("expired") || value.includes("invalid") || value.includes("otp")) return "invalid-link"
  return "unknown"
}
