"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { PaymentResult } from "@/components/payments/PaymentResult";
function Callback() {
  const params = useSearchParams();
  const reference = params.get("paymentReference") || params.get("reference");
  return reference ? (
    <PaymentResult reference={reference} />
  ) : (
    <main className="flex-1 p-12 text-center">
      The payment reference is missing. Check your account orders.
    </main>
  );
}
export default function PaymentCallbackPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <Suspense
        fallback={
          <main className="flex-1 p-12 text-center">Loading payment...</main>
        }
      >
        <Callback />
      </Suspense>
      <Footer />
    </div>
  );
}
