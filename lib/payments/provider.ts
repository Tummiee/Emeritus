import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

export const paymentProviders = ["paystack", "monnify"] as const
export type PaymentProvider = (typeof paymentProviders)[number]

export function isPaymentProvider(value: unknown): value is PaymentProvider {
  return typeof value === "string" && paymentProviders.includes(value as PaymentProvider)
}

export function paymentProviderIsConfigured(provider: PaymentProvider) {
  if (provider === "paystack") return Boolean(process.env.PAYSTACK_SECRET_KEY?.trim())
  return Boolean(
    process.env.MONNIFY_API_KEY?.trim()
      && process.env.MONNIFY_SECRET_KEY?.trim()
      && process.env.MONNIFY_CONTRACT_CODE?.trim()
      && process.env.MONNIFY_BASE_URL?.trim(),
  )
}

export async function getActivePaymentProvider(): Promise<PaymentProvider> {
  const { data, error } = await createAdminClient()
    .from("store_settings")
    .select("value")
    .eq("key", "payment_provider")
    .maybeSingle()

  if (error) {
    console.error("[Payments] Could not read active provider", { code: error.code })
    return "paystack"
  }
  return isPaymentProvider(data?.value) ? data.value : "paystack"
}
