"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { useCart } from "@/lib/contexts/CartContext"
import { usePayment } from "@/lib/hooks/usePayment"

export default function PaymentCallbackPage() {
  const router = useRouter()
  const { authReady, clearCart } = useCart()
  const { verifyPayment } = usePayment()
  const started = useRef(false)
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking")
  const [message, setMessage] = useState("Confirming your payment with Monnify…")

  useEffect(() => {
    if (!authReady || started.current) return
    started.current = true
    const params = new URLSearchParams(window.location.search)
    const reference = params.get("paymentReference") ?? params.get("reference")
    if (!reference) {
      setStatus("error")
      setMessage("Monnify did not return a payment reference.")
      return
    }
    void verifyPayment(reference).then((verified) => {
      if (!verified) {
        setStatus("error")
        setMessage("We could not verify this payment. Your order has not been marked as paid.")
        return
      }
      clearCart()
      sessionStorage.removeItem("emeritus-checkout-idempotency")
      setStatus("success")
      setMessage("Payment confirmed. Your order is now being processed.")
      window.setTimeout(() => router.replace("/account/orders?payment=success"), 1800)
    })
  }, [authReady, clearCart, router, verifyPayment])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="grid flex-1 place-items-center px-4 py-16">
        <section className="w-full max-w-lg rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
          {status === "checking" && <LoaderCircle className="mx-auto size-14 animate-spin text-primary" />}
          {status === "success" && <CheckCircle2 className="mx-auto size-14 text-emerald-600" />}
          {status === "error" && <XCircle className="mx-auto size-14 text-destructive" />}
          <h1 className="mt-5 text-2xl font-bold">
            {status === "checking" ? "Verifying payment" : status === "success" ? "Payment successful" : "Payment not verified"}
          </h1>
          <p className="mt-3 text-muted-foreground">{message}</p>
          {status === "error" && <Link href="/account/orders" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground">View your orders</Link>}
        </section>
      </main>
      <Footer />
    </div>
  )
}
