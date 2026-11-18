"use client"

import { useActionState, useState } from "react"

import { manageRepair, type RepairAdminState } from "@/lib/admin/repair-actions"

const initial: RepairAdminState = { status: "idle" }
const control = "h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100"

export function RepairActions({ id }: { id: string }) {
  const [actionType, setActionType] = useState("approved")
  const [state, action, pending] = useActionState(manageRepair, initial)

  return (
    <form action={action} className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-slate-900">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-xs font-semibold text-slate-700">
          Action
          <select name="status" value={actionType} onChange={(event) => setActionType(event.target.value)} className={control}>
            <option value="approved">Approve</option>
            <option value="rejected">Reject</option>
            <option value="rescheduled">Reschedule</option>
            <option value="diagnosing">Set: Diagnosing</option>
            <option value="awaiting_approval">Set: Awaiting approval</option>
            <option value="repairing">Set: Repairing</option>
            <option value="ready">Set: Ready</option>
            <option value="completed">Set: Completed</option>
            <option value="cancelled">Set: Cancelled</option>
          </select>
        </label>
        {actionType === "rescheduled" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1 text-xs font-semibold text-slate-700">New date<input name="date" type="date" required className={control} /></label>
            <label className="space-y-1 text-xs font-semibold text-slate-700">New time<input name="time" type="time" required className={control} /></label>
          </div>
        )}
      </div>
      <label className="block space-y-1 text-xs font-semibold text-slate-700">
        Message to customer
        <textarea name="message" required minLength={3} rows={2} placeholder="Explain the decision or status update" className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100" />
      </label>
      {state.message && <p className={`text-xs ${state.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{state.message}</p>}
      <button disabled={pending} className="rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-300 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600">
        {pending ? "Updating…" : "Update and notify"}
      </button>
    </form>
  )
}
