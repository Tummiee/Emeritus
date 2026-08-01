import crypto from "node:crypto"

export function amountToKobo(amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid Paystack amount")
  return Math.round(amount * 100)
}

export function paystackAmountsMatch(kobo: unknown, naira: number) {
  const received = typeof kobo === "number" ? kobo : Number(kobo)
  return Number.isFinite(received) && received === amountToKobo(naira)
}

export function createPaystackWebhookSignature(rawBody: string, secret: string) {
  return crypto.createHmac("sha512", secret).update(rawBody).digest("hex")
}

export function paystackSignaturesMatch(expected: string, received: string) {
  if (!/^[a-f0-9]{128}$/i.test(expected) || !/^[a-f0-9]{128}$/i.test(received)) return false
  return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"))
}
