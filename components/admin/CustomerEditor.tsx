"use client"

import { useActionState, useState } from "react"

import { updateCustomer, type CustomerUpdateState } from "@/lib/admin/operations"

type CustomerEditorProps = {
  profile: {
    id: string
    first_name: string
    last_name: string
    phone: string | null
  }
  orders: number
  spent: string
}

const initialState: CustomerUpdateState = { status: "idle" }
const control =
  "w-full rounded-lg border border-slate-300 bg-white p-2.5 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"

export function CustomerEditor({ profile, orders, spent }: CustomerEditorProps) {
  const [editing, setEditing] = useState(false)
  const [state, action, pending] = useActionState(
    async (previousState: CustomerUpdateState, formData: FormData) => {
      const result = await updateCustomer(previousState, formData)
      if (result.status === "success") setEditing(false)
      return result
    },
    initialState,
  )

  if (!editing) {
    return (
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-semibold text-slate-950">
          {[profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Unnamed customer"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {profile.phone || "No phone number"}
        </p>
        {state.message && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
          >
            {state.message}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-4 text-sm">
          <span className="text-slate-500">
            {orders} orders · {spent}
          </span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg border border-slate-300 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Edit contact details
          </button>
        </div>
      </article>
    )
  }

  return (
    <form
      action={action}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
      onSubmit={(event) => {
        if (!window.confirm("Save these contact-detail changes for this customer?")) {
          event.preventDefault()
        }
      }}
    >
      <input type="hidden" name="id" value={profile.id} />
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 text-xs font-semibold text-slate-700">
          First name
          <input name="firstName" defaultValue={profile.first_name} maxLength={60} className={control} />
        </label>
        <label className="space-y-1 text-xs font-semibold text-slate-700">
          Last name
          <input name="lastName" defaultValue={profile.last_name} maxLength={60} className={control} />
        </label>
        <label className="col-span-2 space-y-1 text-xs font-semibold text-slate-700">
          Phone
          <input name="phone" type="tel" defaultValue={profile.phone ?? ""} maxLength={30} className={control} />
        </label>
      </div>
      {state.message && (
        <p role="status" className={`rounded-lg p-3 text-sm ${state.status === "error" ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>
          {state.message}
        </p>
      )}
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save changes"}
        </button>
        <button type="button" disabled={pending} onClick={() => setEditing(false)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">
          Cancel
        </button>
      </div>
    </form>
  )
}
