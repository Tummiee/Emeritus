"use client"

import { useActionState, useState } from "react"
import { changePassword, createRepairRequest, deleteAddress, saveAddress, setDefaultAddress, updateProfile, type AccountState } from "@/lib/account/actions"

const initialAccountState: AccountState = { status: "idle" }

function Submit({ label, pending }: { label: string; pending: boolean }) {
  return <button disabled={pending} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">{pending ? "Saving…" : label}</button>
}
function Notice({ state }: { state: { status: string; message?: string } }) {
  return state.message ? <p role="status" className={`rounded-lg p-3 text-sm ${state.status === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}>{state.message}</p> : null
}
const input = "h-11 w-full rounded-xl border border-input bg-background px-3 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"

export function ProfileForm({ profile, email }: { profile: Record<string, string | null>; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, initialAccountState)
  return <form action={action} className="max-w-2xl space-y-5"><Notice state={state} /><label className="block space-y-2 text-sm font-medium">Email<input value={email} disabled className={`${input} opacity-60`} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">First name<input name="firstName" required defaultValue={profile.first_name ?? ""} className={input} /></label><label className="space-y-2 text-sm font-medium">Last name<input name="lastName" required defaultValue={profile.last_name ?? ""} className={input} /></label></div><label className="block space-y-2 text-sm font-medium">Phone<input name="phone" type="tel" defaultValue={profile.phone ?? ""} className={input} /></label><Submit label="Save profile" pending={pending} /></form>
}

export function AddressForm() {
  const [state, action, pending] = useActionState(saveAddress, initialAccountState)
  return <form action={action} className="space-y-4 rounded-2xl border border-border p-5"><h2 className="font-semibold">Add an address</h2><Notice state={state} /><div className="grid gap-3 sm:grid-cols-2"><input name="label" required placeholder="Label (Home, Office)" className={input} /><input name="recipient" required placeholder="Recipient name" className={input} /><input name="phone" required type="tel" placeholder="Phone" className={input} /><input name="line1" required placeholder="Street address" className={input} /><input name="line2" placeholder="Apartment / landmark (optional)" className={input} /><input name="city" required placeholder="City" className={input} /><input name="state" required placeholder="State" className={input} /><input name="postalCode" placeholder="Postal code" className={input} /><input name="country" required defaultValue="Nigeria" className={input} /></div><label className="flex gap-2 text-sm text-muted-foreground"><input name="isDefault" type="checkbox" className="accent-primary" /> Make this my default address</label><Submit label="Save address" pending={pending} /></form>
}

type AddressCardData = {
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

export function AddressCard({ address }: { address: AddressCardData }) {
  const [editing, setEditing] = useState(false)
  const [defaultState, defaultAction, defaultPending] = useActionState(setDefaultAddress, initialAccountState)
  const [editState, editAction, editPending] = useActionState(saveAddress, initialAccountState)

  if (editing) {
    return (
      <article className="rounded-2xl border border-border p-5">
        <form action={editAction} className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Edit address</h2>
            {address.is_default && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Default</span>}
          </div>
          <Notice state={editState} />
          <input type="hidden" name="id" value={address.id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="label" required aria-label="Address label" placeholder="Label (Home, Office)" defaultValue={address.label} className={input} />
            <input name="recipient" required aria-label="Recipient name" placeholder="Recipient name" defaultValue={address.recipient_name} className={input} />
            <input name="phone" required type="tel" aria-label="Phone" placeholder="Phone" defaultValue={address.phone} className={input} />
            <input name="line1" required aria-label="Street address" placeholder="Street address" defaultValue={address.line1} className={input} />
            <input name="line2" aria-label="Apartment or landmark" placeholder="Apartment / landmark (optional)" defaultValue={address.line2 ?? ""} className={input} />
            <input name="city" required aria-label="City" placeholder="City" defaultValue={address.city} className={input} />
            <input name="state" required aria-label="State" placeholder="State" defaultValue={address.state} className={input} />
            <input name="postalCode" aria-label="Postal code" placeholder="Postal code" defaultValue={address.postal_code ?? ""} className={input} />
            <input name="country" required aria-label="Country" defaultValue={address.country} className={input} />
          </div>
          <label className="flex gap-2 text-sm text-muted-foreground">
            <input name="isDefault" type="checkbox" defaultChecked={address.is_default} className="accent-primary" /> Make this my default address
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <Submit label="Save changes" pending={editPending} />
            <button type="button" disabled={editPending} onClick={() => setEditing(false)} className="text-sm font-medium text-muted-foreground disabled:opacity-50">Cancel</button>
          </div>
        </form>
      </article>
    )
  }

  return (
    <article className="rounded-2xl border border-border p-5">
      <div className="flex justify-between gap-3">
        <p className="font-semibold">{address.label}</p>
        {address.is_default && <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">Default</span>}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {address.recipient_name}<br />
        {address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />
        {address.city}, {address.state} {address.postal_code}<br />
        {address.country}<br />
        {address.phone}
      </p>
      {defaultState.message && <div className="mt-3"><Notice state={defaultState} /></div>}
      <div className="mt-4 flex flex-wrap gap-4">
        <button type="button" onClick={() => setEditing(true)} className="text-sm font-medium text-primary">Edit</button>
        {!address.is_default && (
          <form action={defaultAction}>
            <input type="hidden" name="id" value={address.id} />
            <button disabled={defaultPending} className="text-sm font-medium text-primary disabled:opacity-50">
              {defaultPending ? "Updating…" : "Make default"}
            </button>
          </form>
        )}
        <form action={deleteAddress}>
          <input type="hidden" name="id" value={address.id} />
          <button className="text-sm font-medium text-destructive">Remove</button>
        </form>
      </div>
    </article>
  )
}

export function RepairForm({ devices, brands, minimumDate }: { devices: string[]; brands: string[]; minimumDate: string }) {
  const [state, action, pending] = useActionState(createRepairRequest, initialAccountState)
  return <form action={action} className="space-y-5 rounded-2xl border border-border p-5" encType="multipart/form-data">
    <div><h2 className="font-semibold">Book a repair</h2><p className="mt-1 text-sm text-muted-foreground">Select a preferred appointment. An administrator will confirm or reschedule it.</p></div>
    <Notice state={state} />
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-medium">Device<select name="device" required defaultValue="" className={input}><option value="" disabled>Choose device</option>{devices.map((device) => <option key={device}>{device}</option>)}</select></label>
      <label className="space-y-2 text-sm font-medium">Brand<select name="brand" required defaultValue="" className={input}><option value="" disabled>Choose brand</option>{brands.map((brand) => <option key={brand}>{brand}</option>)}</select></label>
    </div>
    <label className="block space-y-2 text-sm font-medium">Serial / IMEI <span className="font-normal text-muted-foreground">(optional)</span><input name="serial" placeholder="Device identifier" className={input} /></label>
    <label className="block space-y-2 text-sm font-medium">Describe the issue<textarea name="issue" required minLength={20} maxLength={2000} rows={5} placeholder="What happened, when it started, and any troubleshooting attempted" className={`${input} h-auto py-3`} /></label>
    <label className="block space-y-2 text-sm font-medium">Device images <span className="font-normal text-muted-foreground">(up to 5)</span><input name="images" type="file" accept="image/jpeg,image/png,image/webp" multiple className="block w-full rounded-xl border border-dashed border-input p-4 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2" /><span className="block text-xs font-normal text-muted-foreground">JPG, PNG, or WebP. Maximum 5 MB each. Images are optimized at high quality for full-screen inspection.</span></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="space-y-2 text-sm font-medium">Preferred date<input name="date" type="date" min={minimumDate} required className={input} /></label>
      <label className="space-y-2 text-sm font-medium">Preferred time<input name="time" type="time" min="08:00" max="18:00" required className={input} /></label>
    </div>
    <Submit label="Submit booking" pending={pending} />
  </form>
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialAccountState)
  return <form action={action} className="max-w-xl space-y-4"><Notice state={state} /><label className="block space-y-2 text-sm font-medium">New password<input name="password" required type="password" autoComplete="new-password" className={input} /></label><label className="block space-y-2 text-sm font-medium">Confirm password<input name="confirm" required type="password" autoComplete="new-password" className={input} /></label><p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase, and a number.</p><Submit label="Update password" pending={pending} /></form>
}
