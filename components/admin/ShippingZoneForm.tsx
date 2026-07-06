"use client"

import { useState } from "react"

import { deleteShippingZone, saveShippingZone } from "@/lib/admin/operations"
import { NIGERIAN_STATES } from "@/lib/shipping/nigeria"

export type ShippingZoneEditorData = {
  id: string
  name: string
  base_fee: number | string
  free_shipping_threshold: number | string | null
  estimated_days_min: number
  estimated_days_max: number
  is_fallback: boolean
  active: boolean
  states: string[]
}

const input =
  "mt-1.5 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"

export function ShippingZoneForm({ zone }: { zone?: ShippingZoneEditorData }) {
  const [fallback, setFallback] = useState(zone?.is_fallback ?? false)
  const selectedStates = new Set(zone?.states ?? [])

  const form = (
    <form action={saveShippingZone} className="space-y-5">
      <input type="hidden" name="id" value={zone?.id ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          Zone name
          <input name="name" required maxLength={80} defaultValue={zone?.name ?? ""} placeholder="e.g. Lagos delivery" className={input} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Base fee (NGN)
          <input name="baseFee" type="number" required min="0" step="0.01" defaultValue={Number(zone?.base_fee ?? 0)} className={input} />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Free shipping from (NGN)
          <input name="freeThreshold" type="number" min="0" step="0.01" defaultValue={zone?.free_shipping_threshold == null ? "" : Number(zone.free_shipping_threshold)} placeholder="Leave blank to disable" className={input} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium text-slate-700">
            Minimum days
            <input name="minimumDays" type="number" required min="1" max="90" defaultValue={zone?.estimated_days_min ?? 1} className={input} />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Maximum days
            <input name="maximumDays" type="number" required min="1" max="90" defaultValue={zone?.estimated_days_max ?? 3} className={input} />
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 rounded-xl bg-slate-50 p-4">
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input name="active" type="checkbox" defaultChecked={zone?.active ?? true} className="size-4 accent-purple-700" />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            name="fallback"
            type="checkbox"
            checked={fallback}
            onChange={(event) => setFallback(event.target.checked)}
            className="size-4 accent-purple-700"
          />
          Fallback for unmatched states
        </label>
      </div>

      {!fallback && (
        <fieldset>
          <legend className="text-sm font-semibold text-slate-800">Covered states</legend>
          <p className="mt-1 text-xs text-slate-500">A state can belong to only one shipping zone.</p>
          <div className="mt-3 grid max-h-72 gap-2 overflow-y-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {NIGERIAN_STATES.map((state) => (
              <label key={state} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
                <input name="states" type="checkbox" value={state} defaultChecked={selectedStates.has(state)} className="size-4 accent-purple-700" />
                {state}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <button className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-800">
        {zone ? "Save zone" : "Create zone"}
      </button>
    </form>
  )

  if (!zone) return form

  return (
    <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-slate-950">{zone.name}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs ${zone.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {zone.active ? "Active" : "Inactive"}
            </span>
            {zone.is_fallback && <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700">Fallback</span>}
          </div>
          <p className="mt-2 text-sm text-slate-500">
            ₦{Number(zone.base_fee).toLocaleString("en-NG")} · {zone.estimated_days_min}–{zone.estimated_days_max} business days
            {zone.free_shipping_threshold != null && ` · Free from ₦${Number(zone.free_shipping_threshold).toLocaleString("en-NG")}`}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {zone.is_fallback ? "All unmatched Nigerian states" : `${zone.states.length} covered state${zone.states.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <span className="text-sm font-semibold text-purple-700 group-open:hidden">Edit</span>
        <span className="hidden text-sm font-semibold text-slate-500 group-open:inline">Close</span>
      </summary>
      <div className="border-t border-slate-200 p-5">
        {form}
        <form
          action={deleteShippingZone}
          className="mt-5 border-t border-slate-200 pt-4"
          onSubmit={(event) => {
            if (!window.confirm(`Delete the "${zone.name}" shipping zone?`)) event.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={zone.id} />
          <button className="text-sm font-semibold text-red-600 hover:text-red-700">Delete zone</button>
        </form>
      </div>
    </details>
  )
}
