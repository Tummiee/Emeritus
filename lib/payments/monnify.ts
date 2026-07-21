import "server-only"

import { createWebhookSignature, signaturesMatch } from "./monnify-utils"

const REQUEST_TIMEOUT_MS = 15_000
const TOKEN_EXPIRY_SKEW_MS = 60_000

type MonnifyEnvelope<T> = {
  requestSuccessful?: boolean
  responseMessage?: string
  responseCode?: string
  responseBody?: T
}

type TokenBody = { accessToken?: string; expiresIn?: number }

export type MonnifyTransaction = {
  paymentReference: string
  transactionReference: string
  paymentStatus: string
  amountPaid: number
  totalPayable: number
  currency: string
  paymentMethod?: string
  paidOn?: string
  raw: unknown
}

export class MonnifyError extends Error {
  constructor(message: string, public readonly status = 502) {
    super(message)
    this.name = "MonnifyError"
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null

function config() {
  const apiKey = process.env.MONNIFY_API_KEY?.trim()
  const secretKey = process.env.MONNIFY_SECRET_KEY?.trim()
  const contractCode = process.env.MONNIFY_CONTRACT_CODE?.trim()
  const baseUrl = process.env.MONNIFY_BASE_URL?.trim().replace(/\/$/, "")
  if (!apiKey || !secretKey || !contractCode || !baseUrl) {
    throw new MonnifyError("Monnify payment service is not configured", 503)
  }
  let parsed: URL
  try {
    parsed = new URL(baseUrl)
  } catch {
    throw new MonnifyError("Monnify payment service is not configured", 503)
  }
  if (parsed.protocol !== "https:") {
    throw new MonnifyError("Monnify base URL must use HTTPS", 503)
  }
  return { apiKey, secretKey, contractCode, baseUrl }
}

async function requestJson<T>(url: string, init: RequestInit) {
  let response: Response
  try {
    response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
  } catch {
    throw new MonnifyError("Monnify could not be reached. Please try again.")
  }
  const payload = await response.json().catch(() => null) as MonnifyEnvelope<T> | null
  if (!response.ok || !payload?.requestSuccessful || !payload.responseBody) {
    throw new MonnifyError(payload?.responseMessage || "Monnify returned an invalid response", response.status >= 400 ? response.status : 502)
  }
  return payload.responseBody
}

export async function getMonnifyAccessToken(forceRefresh = false) {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt > Date.now() + TOKEN_EXPIRY_SKEW_MS) return tokenCache.token
  const { apiKey, secretKey, baseUrl } = config()
  const credentials = Buffer.from(`${apiKey}:${secretKey}`).toString("base64")
  const body = await requestJson<TokenBody>(`${baseUrl}/api/v1/auth/login`, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
  })
  if (!body.accessToken) throw new MonnifyError("Monnify authentication failed")
  tokenCache = { token: body.accessToken, expiresAt: Date.now() + Math.max(60, Number(body.expiresIn) || 3600) * 1000 }
  return body.accessToken
}

async function authorizedRequest<T>(path: string, init: RequestInit = {}) {
  const { baseUrl } = config()
  const execute = async (refresh: boolean) => {
    const token = await getMonnifyAccessToken(refresh)
    return requestJson<T>(`${baseUrl}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init.headers, Authorization: `Bearer ${token}` },
    })
  }
  try {
    return await execute(false)
  } catch (error) {
    if (error instanceof MonnifyError && (error.status === 401 || error.status === 403)) return execute(true)
    throw error
  }
}

export async function initializeMonnifyTransaction(input: {
  amount: number
  customerName: string
  customerEmail: string
  paymentReference: string
  paymentDescription: string
  currencyCode: string
  redirectUrl: string
  metadata: Record<string, string>
}) {
  const { contractCode } = config()
  const body = await authorizedRequest<{
    transactionReference?: string
    paymentReference?: string
    checkoutUrl?: string
  }>("/api/v1/merchant/transactions/init-transaction", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      contractCode,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
    }),
  })
  if (body.paymentReference !== input.paymentReference || !body.transactionReference || !body.checkoutUrl) {
    throw new MonnifyError("Monnify returned inconsistent transaction details")
  }
  return {
    paymentReference: body.paymentReference,
    transactionReference: body.transactionReference,
    checkoutUrl: body.checkoutUrl,
    raw: body,
  }
}

function numeric(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(parsed)) throw new MonnifyError("Monnify returned an invalid transaction amount")
  return parsed
}

export async function verifyMonnifyTransaction(paymentReference: string): Promise<MonnifyTransaction> {
  const body = await authorizedRequest<Record<string, unknown>>(
    `/api/v2/merchant/transactions/query?paymentReference=${encodeURIComponent(paymentReference)}`,
  )
  return {
    paymentReference: String(body.paymentReference ?? ""),
    transactionReference: String(body.transactionReference ?? ""),
    paymentStatus: String(body.paymentStatus ?? "UNKNOWN").toUpperCase(),
    amountPaid: numeric(body.amountPaid ?? 0),
    totalPayable: numeric(body.totalPayable ?? 0),
    currency: String(body.currencyCode ?? body.currency ?? "").toUpperCase(),
    paymentMethod: body.paymentMethod ? String(body.paymentMethod) : undefined,
    paidOn: body.paidOn ? String(body.paidOn) : undefined,
    raw: body,
  }
}

export function createMonnifyWebhookSignature(rawBody: string, secret = config().secretKey) {
  return createWebhookSignature(rawBody, secret)
}

export function verifyMonnifyWebhookSignature(rawBody: string, signature: string) {
  return signaturesMatch(createMonnifyWebhookSignature(rawBody), signature)
}

export function isMonnifySandbox() {
  return config().baseUrl.includes("sandbox.monnify.com")
}

export { amountsMatch } from "./monnify-utils"




