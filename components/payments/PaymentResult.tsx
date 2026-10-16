"use client";
import { useEffect, useRef, useState } from "react";
import { clearCheckoutKey } from "@/lib/checkout-key";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { useCart } from "@/lib/contexts/CartContext";
export function PaymentResult({ reference }: { reference: string }) {
  const { authReady, refreshCart } = useCart();
  const completed = useRef<string | null>(null);
  const [request, setRequest] = useState(0);
  const [result, setResult] = useState<
    "checking" | "success" | "pending" | "failed" | "review"
  >("checking");
  const [message, setMessage] = useState(
    "Confirming your payment with the provider.",
  );
  useEffect(() => {
    if (!authReady || completed.current === reference) return;
    const controller = new AbortController();
    void fetch("/api/payments/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (controller.signal.aborted) return;
        if (response.ok && payload.data?.status === "success") {
          completed.current = reference;
          setResult("success");
          setMessage(
            "Your payment is confirmed and the order is being prepared.",
          );
          clearCheckoutKey();
          void refreshCart();
          return;
        }
        if (payload.data?.status === "needs_reconciliation") {
          setResult("review");
          setMessage(
            "Your payment was received and needs a support review before the order can be confirmed. Please do not pay again.",
          );
          return;
        }
        if (
          response.status === 202 ||
          response.status >= 500 ||
          payload.data?.status === "pending"
        ) {
          setResult("pending");
          setMessage(
            "Payment confirmation is pending. You can check again or view your orders.",
          );
          return;
        }
        setResult("failed");
        setMessage(
          payload.error ||
            "Payment has not been confirmed. Check your orders before trying another payment.",
        );
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setResult("pending");
          setMessage(
            "Payment confirmation is temporarily unavailable. Check again shortly.",
          );
        }
      });
    return () => controller.abort();
  }, [authReady, refreshCart, reference, request]);
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <section className="w-full max-w-lg text-center" aria-live="polite">
        {result === "success" ? (
          <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
        ) : result === "failed" ? (
          <XCircle className="mx-auto size-14 text-red-600" />
        ) : (
          <LoaderCircle
            className={`mx-auto size-14 text-primary ${result === "checking" ? "animate-spin" : ""}`}
          />
        )}
        <h1 className="mt-6 text-3xl font-bold">
          {result === "success"
            ? "Payment confirmed"
            : result === "review"
              ? "Payment needs review"
              : result === "pending"
                ? "Payment pending"
                : result === "failed"
                  ? "Payment not confirmed"
                  : "Confirming payment"}
        </h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
        <p className="mt-3 break-all text-xs">Reference: {reference}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            className="rounded-lg bg-primary px-5 py-3 text-primary-foreground"
            href="/account/orders"
          >
            View orders
          </Link>
          {result === "pending" && (
            <button
              type="button"
              className="rounded-lg border px-5 py-3"
              onClick={() => {
                setResult("checking");
                setRequest((value) => value + 1);
              }}
            >
              Check again
            </button>
          )}
        </div>
      </section>
    </main>
  );
}
