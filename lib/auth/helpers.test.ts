import { describe, expect, it } from "vitest"

import {
  authCallbackUrl,
  classifyAuthError,
  resolveSiteUrl,
  safeNextPath,
} from "./helpers"

describe("authentication helpers", () => {
  it("accepts only local next paths", () => {
    expect(safeNextPath("/account/orders")).toBe("/account/orders")
    expect(safeNextPath("//evil.example")).toBe("/account")
    expect(safeNextPath("https://evil.example")).toBe("/account")
  })

  it("prefers configured URLs and enforces HTTPS in production", () => {
    expect(resolveSiteUrl({
      siteUrl: "https://emeritus.example/path",
      appUrl: "https://ignored.example",
      nodeEnv: "production",
    })).toBe("https://emeritus.example")
    expect(() => resolveSiteUrl({
      siteUrl: "http://emeritus.example",
      nodeEnv: "production",
    })).toThrow("HTTPS")
  })

  it("builds a flow-aware callback URL", () => {
    expect(authCallbackUrl("http://localhost:3000", "recovery", "/auth/reset-password"))
      .toBe("http://localhost:3000/auth/callback?flow=recovery&next=%2Fauth%2Freset-password")
  })

  it("normalizes common provider failures", () => {
    expect(classifyAuthError({ message: "Email not confirmed" })).toBe("email-not-confirmed")
    expect(classifyAuthError({ status: 429, message: "Too many requests" })).toBe("rate-limited")
    expect(classifyAuthError({ message: "Error sending confirmation email" })).toBe("email-delivery")
  })
})
