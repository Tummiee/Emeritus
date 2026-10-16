"use client";
import { useCallback, useEffect, useState } from "react";
import type { CommerceQuote } from "@/lib/commerce/contracts";

export function useCheckoutQuote(
  items: Array<{ productId: string; quantity: number }>,
  couponCode: string | null,
  state?: string,
  enabled = true,
) {
  const [request, setRequest] = useState(0);
  const body = JSON.stringify({
    items: items.map(({ productId, quantity }) => ({ productId, quantity })),
    couponCode,
    state: state || null,
  });
  const [result, setResult] = useState<{
    body: string;
    request: number;
    quote?: CommerceQuote;
    error?: string;
  }>({ body: "", request: -1 });
  useEffect(() => {
    if (!enabled || !items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/checkout/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        signal: controller.signal,
        cache: "no-store",
      })
        .then(async (response) => {
          const payload = await response.json();
          if (!response.ok)
            throw new Error(payload.error || "Quote unavailable");
          if (!controller.signal.aborted)
            setResult({ body, request, quote: payload.data });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({
              body,
              request,
              error:
                error instanceof Error ? error.message : "Quote unavailable",
            });
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [body, request, enabled, items.length]);
  const current = result.body === body && result.request === request;
  const retry = useCallback(() => setRequest((value) => value + 1), []);
  return {
    quote: current ? result.quote : undefined,
    error: current ? result.error : undefined,
    status: !current
      ? ("loading" as const)
      : result.error
        ? ("error" as const)
        : ("ready" as const),
    retry,
  };
}
