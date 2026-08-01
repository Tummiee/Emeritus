export type PaystackFailureKind =
  | "authentication"
  | "configuration"
  | "network"
  | "rate_limit"
  | "reference_not_found"
  | "request"
  | "provider"

export type PaystackTransactionState =
  | "active"
  | "successful"
  | "terminal"
  | "unknown"

export function classifyPaystackFailure(status: number, message: string): PaystackFailureKind {
  const normalized = message.trim().toLowerCase()

  if (status === 401 || status === 403) return "authentication"
  if (status === 429) return "rate_limit"
  if (
    status === 404
    || /(?:transaction\s+)?reference\s+(?:was\s+)?not\s+found/.test(normalized)
    || normalized.includes("transaction not found")
  ) return "reference_not_found"
  if (status >= 500) return "provider"
  return "request"
}

export function classifyPaystackTransactionStatus(status: string): PaystackTransactionState {
  const normalized = status.trim().toLowerCase()
  if (normalized === "success") return "successful"
  if (["pending", "ongoing", "processing", "queued"].includes(normalized)) return "active"
  if (["failed", "abandoned", "reversed", "cancelled", "canceled"].includes(normalized)) return "terminal"
  return "unknown"
}

export function paystackAttemptHasExpired(expiresAt: string | null | undefined, now = Date.now()) {
  if (!expiresAt) return false
  const timestamp = Date.parse(expiresAt)
  return Number.isFinite(timestamp) && timestamp <= now
}
