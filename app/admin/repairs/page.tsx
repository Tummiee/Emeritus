import Image from "next/image"

import { RepairActions } from "@/components/admin/RepairActions"
import { createClient } from "@/lib/supabase/server"

const statusStyles: Record<string, string> = {
  submitted: "border-blue-200 bg-blue-50 text-blue-800",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-red-200 bg-red-50 text-red-800",
  rescheduled: "border-violet-200 bg-violet-50 text-violet-800",
  diagnosing: "border-cyan-200 bg-cyan-50 text-cyan-800",
  awaiting_approval: "border-amber-200 bg-amber-50 text-amber-900",
  repairing: "border-indigo-200 bg-indigo-50 text-indigo-800",
  ready: "border-teal-200 bg-teal-50 text-teal-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-slate-300 bg-slate-100 text-slate-700",
}

export default async function AdminRepairsPage() {
  const supabase = await createClient()
  const { data: bookings } = await supabase.from("repair_requests").select("*").order("created_at", { ascending: false })
  const userIds = Array.from(new Set(bookings?.map((booking) => booking.user_id) ?? []))
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id,first_name,last_name,phone").in("id", userIds)
    : { data: [] }
  const customers = new Map(profiles?.map((profile) => [profile.id, profile]))
  const rows = await Promise.all((bookings ?? []).map(async (booking) => {
    const images = await Promise.all((booking.image_paths ?? []).map(async (path: string) => {
      const { data } = await supabase.storage.from("repair-images").createSignedUrl(path, 900)
      return data?.signedUrl
    }))
    return { ...booking, images: images.filter(Boolean) as string[] }
  }))

  return (
    <main className="min-w-0 p-5 text-slate-950 lg:p-8">
      <h1 className="text-3xl font-bold text-slate-950">Repair bookings</h1>
      <p className="mt-1 text-slate-600">Review appointments, manage repair status, and notify customers.</p>
      <div className="mt-8 space-y-5">
        {!rows.length && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">No repair bookings received.</div>}
        {rows.map((booking) => {
          const customer = customers.get(booking.user_id)
          return (
            <article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-purple-700">{booking.reference}</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{booking.brand} {booking.device}</h2>
                  <p className="text-sm text-slate-600">
                    {customer ? `${customer.first_name} ${customer.last_name}` : "Customer"}
                    {customer?.phone ? ` · ${customer.phone}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyles[booking.status] ?? "border-slate-300 bg-slate-100 text-slate-700"}`}>
                    {booking.status.replaceAll("_", " ")}
                  </span>
                  <p className="mt-2 text-sm font-medium text-slate-800">{booking.booking_date} · {String(booking.booking_time).slice(0, 5)}</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
                <p className="font-semibold">Reported issue</p>
                <p className="mt-1 whitespace-pre-wrap text-slate-600">{booking.issue}</p>
                {booking.serial_number && <p className="mt-2 text-xs text-slate-700">Serial / IMEI: {booking.serial_number}</p>}
              </div>
              {!!booking.images.length && (
                <div className="mt-4 flex gap-3 overflow-x-auto">
                  {booking.images.map((url: string, index: number) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                      <Image src={url} alt={`Repair evidence ${index + 1}`} fill className="object-cover" unoptimized />
                    </a>
                  ))}
                </div>
              )}
              {booking.status_note && (
                <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-slate-700">
                  <span className="font-semibold text-slate-900">Latest customer note:</span> {booking.status_note}
                </p>
              )}
              <RepairActions id={booking.id} />
            </article>
          )
        })}
      </div>
    </main>
  )
}
