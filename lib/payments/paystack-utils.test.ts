import { describe, expect, it } from "vitest"

import {
  amountToKobo,
  createPaystackWebhookSignature,
  paystackAmountsMatch,
  paystackSignaturesMatch,
} from "./paystack-utils"

describe("Paystack payment utilities", () => {
  it("converts naira to Paystack's kobo amount", () => {
    expect(amountToKobo(1250.5)).toBe(125050)
    expect(paystackAmountsMatch(125050, 1250.5)).toBe(true)
    expect(paystackAmountsMatch(125051, 1250.5)).toBe(false)
  })

  it("rejects invalid checkout amounts", () => {
    expect(() => amountToKobo(0)).toThrow("Invalid Paystack amount")
    expect(() => amountToKobo(Number.NaN)).toThrow("Invalid Paystack amount")
  })

  it("validates webhook signatures without accepting malformed values", () => {
    const raw = JSON.stringify({ event: "charge.success", data: { reference: "EG-test" } })
    const signature = createPaystackWebhookSignature(raw, "test-secret")
    expect(paystackSignaturesMatch(signature, signature)).toBe(true)
    expect(paystackSignaturesMatch(signature, signature.replace(/^./, "0"))).toBe(false)
    expect(paystackSignaturesMatch(signature, "not-a-signature")).toBe(false)
  })
})
