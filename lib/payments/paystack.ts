import "server-only"

import {
  amountToKobo,
  createPaystackWebhookSignature,
  paystackSignaturesMatch,
} from "./paystack-utils"
import { classifyPaystackFailure, type PaystackFailureKind } from "./paystack-lifecycle"

const REQUEST_TIMEOUT_MS = 15_000

type PaystackEnvelope<T> = {
  status?: boolean
  message?: string
  data?: T
}

export type PaystackTransaction = {
  status: string
  reference: string
  amount: number
  currency: string
  channel?: string
  paidAt?: string
  raw: unknown
}

export class PaystackError extends Error {
  constructor(
    message: string,
    public readonly status = 502,
    public readonly kind: PaystackFailureKind = "provider",
    public readonly upstreamStatus?: number,
  ) {
    super(message)
    this.name = "PaystackError"
  }
}

function secretKey() {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim()
  if (!secret) throw new PaystackError("Paystack payment service is not configured", 503, "configuration")
  return secret
}

async function request<T>(url: string, init: RequestInit = {}) {
  const secret = secretKey()
  let response: Response
  try {
    response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    })
  } catch {
    throw new PaystackError("Paystack could not be reached. Please try again.", 502, "network")
  }

  const payload = await response.json().catch(() => null) as PaystackEnvelope<T> | null
  if (!response.ok || !payload?.status || !payload.data) {
    const message = payload?.message || "Paystack returned an invalid response"
    const kind = classifyPaystackFailure(response.status, message)
    const status = kind === "authentication" || kind === "rate_limit"
      ? 503
      : kind === "reference_not_found"
        ? 404
        : response.status >= 400 && response.status < 500
          ? response.status
          : 502
    throw new PaystackError(message, status, kind, response.status)
  }
  return payload.data
}

export async function initializePaystackTransaction(input: {
  email: string
  amount: number
  currency: string
  reference: string
  callbackUrl: string
  metadata: Record<string, string>
}) {
  const data = await request<{ authorization_url?: string; access_code?: string; reference?: string }>(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      body: JSON.stringify({
        email: input.email,
        amount: String(amountToKobo(input.amount)),
        currency: input.currency,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    },
  )
  if (data.reference !== input.reference || !data.authorization_url || !data.access_code) {
    throw new PaystackError("Paystack returned inconsistent transaction details")
  }
  return {
    reference: data.reference,
    checkoutUrl: data.authorization_url,
    accessCode: data.access_code,
    raw: data,
  }
}

export async function verifyPaystackTransaction(reference: string): Promise<PaystackTransaction> {
  const data = await request<{
    status?: string
    reference?: string
    amount?: number
    currency?: string
    channel?: string
    paid_at?: string
  }>(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`)

  return {
    status: String(data.status ?? "unknown").toLowerCase(),
    reference: String(data.reference ?? ""),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "").toUpperCase(),
    channel: data.channel,
    paidAt: data.paid_at,
    raw: data,
  }
}

export function verifyPaystackWebhookSignature(rawBody: string, signature: string) {
  return paystackSignaturesMatch(
    createPaystackWebhookSignature(rawBody, secretKey()),
    signature,
  )
}
