"use client";

import { useState } from "react";

interface InitializePaymentParams {
  items: Array<{ productId: string; quantity: number }>;
  shippingAddress: {
    firstName: string;
    lastName: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
  couponCode?: string | null;
  idempotencyKey: string;
}

interface PaymentResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
  orderId: string;
  orderNumber?: string;
}

export function usePayment() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const initializePayment = async (
    params: InitializePaymentParams,
  ): Promise<PaymentResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const request = (input: InitializePaymentParams) =>
        fetch("/api/payments/initialize", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(input),
        });

      let response = await request(params);
      let data = await response.json();

      if (response.status === 409 && data.resetIdempotency) {
        const idempotencyKey = crypto.randomUUID();
        sessionStorage.setItem("emeritus-checkout-idempotency", idempotencyKey);
        response = await request({ ...params, idempotencyKey });
        data = await response.json();
      }

      if (!response.ok) {
        if (response.status === 401 && data.loginUrl) {
          window.location.assign(data.loginUrl);
          return null;
        }
        throw new Error(data.error || "Failed to initialize payment");
      }
      return data.data as PaymentResponse;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Payment initialization failed",
      );
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPayment = async (reference: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reference }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify payment");
      }

      if (data.data.status === "success") {
        setSuccess(true);
        return true;
      }

      throw new Error("Payment not successful");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Payment verification failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const openPaystackCheckout = (reference: string, publicKey: string) => {
    if (typeof window === "undefined") {
      console.error("Paystack checkout can only be opened in browser");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;

    script.onload = () => {
      const PaystackPop = (window as any).PaystackPop;

      PaystackPop.cancelledTransaction = () => {
        setError("Payment cancelled");
      };

      PaystackPop.transactionVerified = () => {
        setSuccess(true);
      };
    };

    document.body.appendChild(script);
  };

  return {
    isLoading,
    error,
    success,
    initializePayment,
    verifyPayment,
    openPaystackCheckout,
  };
}
