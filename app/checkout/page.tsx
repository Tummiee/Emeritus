"use client"

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import { AlertCircle, Check, Lock, MapPin, Plus, ShieldCheck } from "lucide-react"

import Footer from "@/components/Footer"
import Header from "@/components/Header"
import { useCart } from "@/lib/contexts/CartContext"
import { usePayment } from "@/lib/hooks/usePayment"
import { NIGERIAN_STATES } from "@/lib/shipping/nigeria"
import { createClient } from "@/lib/supabase/client"

const idempotencyStorageKey = "emeritus-checkout-idempotency"

type SavedAddress = {
  id: string
  label: string
  recipient_name: string
  phone: string
  line1: string
  line2: string | null
  city: string
  state: string
  postal_code: string | null
  country: string
  is_default: boolean
}

type ShippingQuote = {
  zoneId: string
  zoneName: string
  fee: number
  freeShippingThreshold: number | null
  estimatedDaysMin: number
  estimatedDaysMax: number
  quotedState: string
  merchandiseTotal: number
  quotedCountry: string
}

function deliveryFields(address: SavedAddress) {
  return {
    phone: address.phone,
    address: [address.line1, address.line2].filter(Boolean).join(", "),
    city: address.city,
    state: address.state,
    zip: address.postal_code ?? "",
    country: address.country,
  }
}

function checkoutKey() {
  const existing = sessionStorage.getItem(idempotencyStorageKey)
  if (existing) return existing
  const created = crypto.randomUUID()
  sessionStorage.setItem(idempotencyStorageKey, created)
  return created
}

export default function CheckoutPage() {
  const { items, total, discount, couponCode, discountedTotal } = useCart()
  const { initializePayment, isLoading, error } = usePayment()
  const [accountEmail, setAccountEmail] = useState("")
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [addressMode, setAddressMode] = useState<"saved" | "new">("saved")
  const [addressPickerOpen, setAddressPickerOpen] = useState(false)
  const [addressesLoading, setAddressesLoading] = useState(true)
  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError, setShippingError] = useState("")
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "Nigeria",
  })

  useEffect(() => {
    const supabase = createClient()
    void Promise.all([
      supabase.auth.getUser(),
      supabase.from("profiles").select("first_name,last_name,phone").maybeSingle(),
      supabase
        .from("addresses")
        .select("id,label,recipient_name,phone,line1,line2,city,state,postal_code,country,is_default")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true }),
    ]).then(([auth, profile, addressResult]) => {
      const user = auth.data.user
      setAccountEmail(user?.email ?? "")
      const addresses = (addressResult.data ?? []) as SavedAddress[]
      const preferredAddress = addresses.find((address) => address.is_default) ?? addresses[0]
      setSavedAddresses(addresses)
      setSelectedAddressId(preferredAddress?.id ?? null)
      setAddressMode(preferredAddress ? "saved" : "new")

      const googleFullName = user?.user_metadata.full_name as string | undefined
      const [googleFirstName, ...googleLastNameParts] = googleFullName?.split(" ") || []

      setForm((current) => ({
        ...current,
        firstName: profile.data?.first_name || googleFirstName || current.firstName,
        lastName: profile.data?.last_name || googleLastNameParts.join(" ") || current.lastName,
        phone: profile.data?.phone || current.phone,
        ...(preferredAddress ? deliveryFields(preferredAddress) : {}),
      }))
    }).finally(() => setAddressesLoading(false))
  }, [])

  useEffect(() => {
    const state = form.state.trim()
    if (state.length < 2 || addressesLoading) {
      return
    }

    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setShippingLoading(true)
      setShippingError("")
      void fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state, country: form.country, merchandiseTotal: discountedTotal }),
        signal: controller.signal,
      })
        .then(async (response) => {
          const result = await response.json()
          if (!response.ok) throw new Error(result.error || "Shipping could not be calculated.")
          setShippingQuote({
            ...result.data,
            fee: Number(result.data.fee),
            freeShippingThreshold: result.data.freeShippingThreshold == null
              ? null
              : Number(result.data.freeShippingThreshold),
            quotedState: state.toLowerCase(),
            merchandiseTotal: discountedTotal,
            quotedCountry: form.country.trim().toLowerCase(),
          })
        })
        .catch((caught) => {
          if (caught instanceof DOMException && caught.name === "AbortError") return
          setShippingQuote(null)
          setShippingError(caught instanceof Error ? caught.message : "Shipping could not be calculated.")
        })
        .finally(() => {
          if (!controller.signal.aborted) setShippingLoading(false)
        })
    }, 300)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [addressesLoading, discountedTotal, form.country, form.state])

  const selectedAddress =
    savedAddresses.find((address) => address.id === selectedAddressId) ?? null
  const currentShippingQuote =
    shippingQuote?.quotedState === form.state.trim().toLowerCase()
      && shippingQuote.merchandiseTotal === discountedTotal
      && shippingQuote.quotedCountry === form.country.trim().toLowerCase()
      ? shippingQuote
      : null

  function selectSavedAddress(address: SavedAddress) {
    setSelectedAddressId(address.id)
    setAddressMode("saved")
    setAddressPickerOpen(false)
    setForm((current) => ({ ...current, ...deliveryFields(address) }))
  }

  function useNewAddress() {
    setAddressMode("new")
    setAddressPickerOpen(false)
    setForm((current) => ({
      ...current,
      phone: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      country: "Nigeria",
    }))
  }

  function update(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentShippingQuote || shippingLoading) {
      setShippingError("Wait for shipping to be calculated before continuing.")
      return
    }
    const payment = await initializePayment({
      items: items.map(({ productId, quantity }) => ({ productId, quantity })),
      shippingAddress: form,
      couponCode,
      idempotencyKey: checkoutKey(),
    })
    if (payment?.authorization_url) window.location.assign(payment.authorization_url)
  }

  if (!items.length) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="text-3xl font-bold">Your cart is empty</h1>
            <p className="mt-3 text-muted-foreground">Add an item before starting checkout.</p>
            <Link href="/shop" className="mt-6 inline-flex rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground">
              Browse products
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 lg:grid-cols-[1fr_380px]">
          <form onSubmit={submit} className="space-y-7">
            <div>
              <h1 className="text-3xl font-bold">Checkout</h1>
              <p className="mt-2 text-sm text-muted-foreground">Payment will open on Paystack after your order is validated.</p>
            </div>

            {error && (
              <div role="alert" className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="size-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {shippingError && (
              <div role="alert" className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="size-5 shrink-0" />
                <span>{shippingError}</span>
              </div>
            )}

            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-lg font-semibold">Contact and delivery</h2>
              {accountEmail && <p className="mt-1 text-sm text-muted-foreground">Checkout account: {accountEmail}</p>}
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="First name" name="firstName" value={form.firstName} onChange={update} autoComplete="given-name" />
                <Field label="Last name" name="lastName" value={form.lastName} onChange={update} autoComplete="family-name" />
              </div>

              <div className="mt-5 border-t border-border pt-5">
                <div className="flex items-center justify-between gap-4">
                  <h3 className="text-sm font-semibold">Delivery address</h3>
                  {!!savedAddresses.length && addressMode === "saved" && (
                    <button
                      type="button"
                      onClick={() => setAddressPickerOpen((open) => !open)}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Change address
                    </button>
                  )}
                </div>

                {addressesLoading ? (
                  <div className="mt-3 h-32 animate-pulse rounded-xl bg-muted" />
                ) : addressMode === "saved" && selectedAddress ? (
                  <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                        <MapPin className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{selectedAddress.label}</p>
                          {selectedAddress.is_default && (
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {selectedAddress.recipient_name}<br />
                          {selectedAddress.line1}{selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}<br />
                          {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postal_code}<br />
                          {selectedAddress.country} · {selectedAddress.phone}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Phone" name="phone" type="tel" value={form.phone} onChange={update} autoComplete="tel" />
                    <Field label="Address" name="address" value={form.address} onChange={update} autoComplete="street-address" />
                    <Field label="City" name="city" value={form.city} onChange={update} autoComplete="address-level2" />
                    <SelectField label="State" name="state" value={form.state} onChange={update} autoComplete="address-level1">
                      <option value="">Choose state</option>
                      {NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                    </SelectField>
                    <Field label="Postal code" name="zip" value={form.zip} onChange={update} autoComplete="postal-code" required={false} />
                    <Field label="Country" name="country" value={form.country} onChange={update} autoComplete="country-name" />
                  </div>
                )}

                {addressPickerOpen && (
                  <div className="mt-4 space-y-2 rounded-xl border border-border bg-background p-3">
                    {savedAddresses.map((address) => (
                      <button
                        key={address.id}
                        type="button"
                        onClick={() => selectSavedAddress(address)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                          address.id === selectedAddressId
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold">{address.label}</span>
                          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                            {address.line1}, {address.city}, {address.state}
                          </span>
                        </span>
                        {address.id === selectedAddressId && <Check className="size-4 text-primary" />}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={useNewAddress}
                      className="flex w-full items-center gap-3 rounded-lg border border-dashed border-border p-3 text-left text-sm font-semibold text-primary hover:bg-muted/50"
                    >
                      <Plus className="size-4" />
                      Use a new address for this order
                    </button>
                  </div>
                )}

                {!addressesLoading && addressMode === "new" && savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedAddress) selectSavedAddress(selectedAddress)
                      else setAddressPickerOpen(true)
                    }}
                    className="mt-4 text-sm font-semibold text-primary hover:underline"
                  >
                    Use a saved address instead
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-5 text-emerald-600" />
                <div>
                  <h2 className="font-semibold">Secure Paystack payment</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Your final total and stock availability are verified on the server before payment begins.
                  </p>
                </div>
              </div>
            </section>

            <button disabled={isLoading || shippingLoading || !currentShippingQuote} className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60">
              <Lock className="size-4" />
              {isLoading ? "Preparing secure payment…" : shippingLoading ? "Calculating shipping…" : "Continue to Paystack"}
            </button>
          </form>

          <aside className="h-fit border-t border-border pt-6 lg:sticky lg:top-8">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div key={item.productId} className="flex justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                  <span>{money(item.price * item.quantity)}</span>
                </div>
              ))}
              <Summary label="Subtotal" value={money(total)} />
              {discount > 0 && <Summary label={`Discount (${couponCode})`} value={`-${money(discount)}`} accent />}
              <Summary
                label="Shipping"
                value={
                  shippingLoading
                    ? "Calculating…"
                    : currentShippingQuote
                      ? currentShippingQuote.fee === 0 ? "FREE" : money(currentShippingQuote.fee)
                      : "Select an address"
                }
                accent={currentShippingQuote?.fee === 0}
              />
              {currentShippingQuote && (
                <p className="text-xs text-muted-foreground">
                  {currentShippingQuote.zoneName} · Estimated {currentShippingQuote.estimatedDaysMin}–{currentShippingQuote.estimatedDaysMax} business days
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-4 text-lg font-semibold">
                <span>Estimated total</span>
                <span>{money(discountedTotal + (currentShippingQuote?.fee ?? 0))}</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Product availability, coupon eligibility and the final amount are recalculated securely before Paystack opens.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function Field({
  label,
  required = true,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <input {...props} required={required} className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
    </label>
  )
}

function SelectField({
  label,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2 text-sm font-medium">
      <span>{label}</span>
      <select {...props} required className="h-11 w-full rounded-lg border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
        {children}
      </select>
    </label>
  )
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${accent ? "text-emerald-700" : "text-muted-foreground"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function money(value: number) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(value)
}
