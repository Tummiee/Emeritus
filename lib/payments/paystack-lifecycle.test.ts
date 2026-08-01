import { describe, expect, it } from "vitest"

import {
  classifyPaystackFailure,
  classifyPaystackTransactionStatus,
  paystackAttemptHasExpired,
} from "./paystack-lifecycle"

describe("Paystack lifecycle classification", () => {
  it("recognizes unavailable references without treating every bad request as unavailable", () => {
    expect(classifyPaystackFailure(400, "Transaction reference not found.")).toBe("reference_not_found")
    expect(classifyPaystackFailure(404, "Not found")).toBe("reference_not_found")
    expect(classifyPaystackFailure(400, "Duplicate Transaction Reference")).toBe("request")
  })

  it("keeps authentication, rate limits, and provider outages retryable", () => {
    expect(classifyPaystackFailure(401, "Invalid key")).toBe("authentication")
    expect(classifyPaystackFailure(429, "Too many requests")).toBe("rate_limit")
    expect(classifyPaystackFailure(503, "Unavailable")).toBe("provider")
  })

  it("classifies provider transaction states conservatively", () => {
    expect(classifyPaystackTransactionStatus("success")).toBe("successful")
    expect(classifyPaystackTransactionStatus("pending")).toBe("active")
    expect(classifyPaystackTransactionStatus("abandoned")).toBe("terminal")
    expect(classifyPaystackTransactionStatus("mystery")).toBe("unknown")
  })

  it("expires attempts using the server timestamp", () => {
    const now = Date.parse("2026-08-01T12:00:00.000Z")
    expect(paystackAttemptHasExpired("2026-08-01T11:59:59.000Z", now)).toBe(true)
    expect(paystackAttemptHasExpired("2026-08-01T12:00:01.000Z", now)).toBe(false)
    expect(paystackAttemptHasExpired(null, now)).toBe(false)
  })
})
