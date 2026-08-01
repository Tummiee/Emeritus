import { CheckCircle2, CircleAlert, CreditCard, Landmark } from "lucide-react"

import { updatePaymentProvider } from "@/lib/admin/operations"
import {
  getActivePaymentProvider,
  paymentProviderIsConfigured,
  type PaymentProvider,
} from "@/lib/payments/provider"

const details: Record<PaymentProvider, { name: string; description: string; icon: typeof CreditCard }> = {
  paystack: {
    name: "Paystack",
    description: "Card, bank transfer, USSD and supported Paystack channels.",
    icon: CreditCard,
  },
  monnify: {
    name: "Monnify",
    description: "Hosted Monnify checkout for cards, transfers and USSD.",
    icon: Landmark,
  },
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string; error?: string }>
}) {
  const params = await searchParams
  const active = await getActivePaymentProvider()
  const target: PaymentProvider = active === "paystack" ? "monnify" : "paystack"
  const targetConfigured = paymentProviderIsConfigured(target)

  return (
    <main className="p-5 lg:p-8">
      <div className="max-w-4xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Commerce configuration</p>
        <h1 className="mt-2 text-3xl font-bold">Payments</h1>
        <p className="mt-2 text-slate-500">
          Choose the provider used for new checkout sessions. Existing payments continue with the provider that created them.
        </p>

        {params.updated && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            <CheckCircle2 className="size-5" /> Payment provider changed to {details[active].name}.
          </div>
        )}
        {params.error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <CircleAlert className="size-5" />
            {params.error.endsWith("-not-configured")
              ? "Add that provider's required environment variables before enabling it."
              : "The payment provider could not be updated."}
          </div>
        )}

        <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-semibold text-slate-500">Active checkout provider</p>
              <p className="mt-1 text-2xl font-bold">{details[active].name}</p>
              <p className="mt-2 max-w-xl text-sm text-slate-500">{details[active].description}</p>
            </div>

            <form action={updatePaymentProvider}>
              <button
                name="provider"
                value={target}
                role="switch"
                aria-checked={active === "monnify"}
                disabled={!targetConfigured}
                className="group flex items-center gap-3 rounded-full border border-slate-200 bg-slate-100 p-1.5 pr-4 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className={`relative h-8 w-14 rounded-full transition ${active === "monnify" ? "bg-primary" : "bg-slate-900"}`}>
                  <span className={`absolute top-1 size-6 rounded-full bg-white shadow transition ${active === "monnify" ? "left-7" : "left-1"}`} />
                </span>
                <span className="text-sm font-semibold">Switch to {details[target].name}</span>
              </button>
            </form>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {(Object.keys(details) as PaymentProvider[]).map((provider) => {
              const providerDetails = details[provider]
              const Icon = providerDetails.icon
              const configured = paymentProviderIsConfigured(provider)
              return (
                <div key={provider} className={`rounded-xl border p-4 ${provider === active ? "border-primary bg-primary/5" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 font-semibold"><Icon className="size-5" />{providerDetails.name}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${configured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                      {configured ? "Configured" : "Needs credentials"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{providerDetails.description}</p>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}
