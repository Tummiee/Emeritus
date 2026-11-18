"use client"

import { CheckCircle2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

type RetryResponse = {
  error?: string
  data?: {
    checkoutUrl?: string
    status?: "pending" | "success"
  }
}

type RetryState = "idle" | "checking" | "opening" | "confirmed"

export function RetryPaymentButton({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [state, setState] = useState<RetryState>("idle")
  const [error, setError] = useState<string | null>(null)
  const isLoading = state === "checking" || state === "opening"

  async function retryPayment() {
    if (isLoading) return
    setState("checking")
    setError(null)

    try {
      const response = await fetch("/api/payments/retry", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      const payload = await response.json().catch(() => null) as RetryResponse | null

      if (!response.ok) {
        throw new Error(payload?.error || "Payment retry could not be started")
      }
      if (payload?.data?.status === "success") {
        setState("confirmed")
        router.refresh()
        return
      }
      if (!payload?.data?.checkoutUrl) {
        throw new Error("The payment provider did not return a checkout link")
      }

      setState("opening")
      window.location.assign(payload.data.checkoutUrl)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Payment retry could not be started")
      setState("idle")
    }
  }

  const label = state === "checking"
    ? "Checking payment…"
    : state === "opening"
      ? "Opening payment…"
      : state === "confirmed"
        ? "Payment confirmed"
        : "Retry payment"

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={retryPayment}
        disabled={isLoading || state === "confirmed"}
        className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="Retry payment for this order"
      >
        {state === "confirmed" ? (
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
        ) : (
          <RefreshCw className={`size-3.5 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
        )}
        {label}
      </button>
      {error && (
        <p className="max-w-64 text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
