import crypto from "node:crypto"

export function createWebhookSignature(rawBody: string, secret: string) {
  return crypto.createHmac("sha512", secret).update(rawBody).digest("hex")
}

export function signaturesMatch(expected: string, supplied: string) {
  const normalized = supplied.trim().toLowerCase()
  return normalized.length === expected.length
    && crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected))
}

export function amountsMatch(actual: number, expected: number) {
  return Number.isFinite(actual)
    && Number.isFinite(expected)
    && Math.round(actual * 100) >= Math.round(expected * 100)
}

export function transactionMatches(
  transaction: {
    paymentReference: string
    transactionReference: string
    paymentStatus: string
    amountPaid: number
    currency: string
  },
  expected: {
    paymentReference: string
    transactionReference: string
    amount: number
    currency: string
  },
) {
  return transaction.paymentStatus === "PAID"
    && transaction.paymentReference === expected.paymentReference
    && transaction.transactionReference === expected.transactionReference
    && transaction.currency === expected.currency.toUpperCase()
    && amountsMatch(transaction.amountPaid, expected.amount)
}
