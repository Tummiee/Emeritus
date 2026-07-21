import { describe, expect, it } from "vitest"

import {
  amountsMatch,
  createWebhookSignature,
  signaturesMatch,
  transactionMatches,
} from "./monnify-utils"

describe("Monnify payment helpers", () => {
  it("creates and validates the HMAC-SHA512 webhook signature", () => {
    const body = JSON.stringify({ eventType: "SUCCESSFUL_TRANSACTION" })
    const signature = createWebhookSignature(body, "test-secret")

    expect(signaturesMatch(signature, signature.toUpperCase())).toBe(true)
    expect(signaturesMatch(signature, "invalid")).toBe(false)
    expect(createWebhookSignature(body + " ", "test-secret")).not.toBe(signature)
  })

  it("accepts exact and over payments but rejects underpayments", () => {
    expect(amountsMatch(25_000, 25_000)).toBe(true)
    expect(amountsMatch(25_000.01, 25_000)).toBe(true)
    expect(amountsMatch(24_999.99, 25_000)).toBe(false)
    expect(amountsMatch(Number.NaN, 25_000)).toBe(false)
  })

  it("requires every authoritative transaction field to match", () => {
    const transaction = {
      paymentReference: "EG-123",
      transactionReference: "MNFY|1|2",
      paymentStatus: "PAID",
      amountPaid: 10_000,
      currency: "NGN",
    }
    const expected = {
      paymentReference: "EG-123",
      transactionReference: "MNFY|1|2",
      amount: 10_000,
      currency: "NGN",
    }

    expect(transactionMatches(transaction, expected)).toBe(true)
    expect(transactionMatches({ ...transaction, paymentStatus: "PENDING" }, expected)).toBe(false)
    expect(transactionMatches({ ...transaction, amountPaid: 9_999 }, expected)).toBe(false)
    expect(transactionMatches({ ...transaction, transactionReference: "MNFY|forged" }, expected)).toBe(false)
  })
})
