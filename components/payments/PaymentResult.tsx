"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";

import { useCart } from "@/lib/contexts/CartContext";

type Result = "checking" | "success" | "pending" | "failed";

export function PaymentResult({ reference }: { reference: string }) {
  const { authReady, clearCart } = useCart();
  const [result, setResult] = useState<Result>("checking");
  const [message, setMessage] = useState("Confirming your payment with Monnify.");

  useEffect(() => {
    if (!authReady) return;

    let cancelled = false;

    async function verify() {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });
      const payload = await response.json().catch(() => ({}));
      if (cancelled) return;

      if (response.ok && payload.data?.status === "success") {
        clearCart();
        sessionStorage.removeItem("emeritus-checkout-idempotency");
        setResult("success");
        setMessage("Your payment is confirmed and the order is being prepared.");
        return;
      }
      if (response.status === 202 || payload.data?.status === "pending") {
        setResult("pending");
        setMessage("Monnify is still processing this payment. You can safely check your orders again shortly.");
        return;
      }
      setResult("failed");
      setMessage(payload.error || "We could not confirm this payment.");
    }

    void verify().catch(() => {
      if (!cancelled) {
        setResult("pending");
        setMessage("Payment confirmation is temporarily unavailable. Your order will update automatically when Monnify confirms it.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, clearCart, reference]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg text-center">
        {result === "checking" && <LoaderCircle className="mx-auto size-14 animate-spin text-primary" />}
        {result === "success" && <CheckCircle2 className="mx-auto size-14 text-emerald-600" />}
        {result === "pending" && <LoaderCircle className="mx-auto size-14 text-amber-600" />}
        {result === "failed" && <XCircle className="mx-auto size-14 text-red-600" />}
        <h1 className="mt-6 text-3xl font-bold">
          {result === "checking"
            ? "Confirming payment"
            : result === "success"
              ? "Payment confirmed"
              : result === "pending"
                ? "Payment pending"
                : "Payment not confirmed"}
        </h1>
        <p className="mt-3 text-muted-foreground">{message}</p>
        <p className="mt-3 break-all text-xs text-muted-foreground">Reference: {reference}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/account/orders" className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">
            View orders
          </Link>
          {result !== "success" && (
            <Link href="/checkout" className="rounded-lg border border-border px-5 py-3 font-semibold">
              Return to checkout
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
