import Link from "next/link"

import { ReportCard } from "@/components/admin/ReportCard"
import { generateReport } from "@/lib/admin/operations"
import { createClient } from "@/lib/supabase/server"

const pageSize = 20

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; error?: string; generated?: string; deleted?: string }>
}) {
  const params = await searchParams
  const requestedPage = Number.parseInt(params.page ?? "1", 10)
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const supabase = await createClient()
  const { data, count, error } = await supabase
    .from("generated_reports")
    .select("id,name,report_type,period_start,period_end,data,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  const todayDate = new Date()
  const startDate = new Date(todayDate)
  startDate.setUTCDate(startDate.getUTCDate() - 29)
  const today = todayDate.toISOString().slice(0, 10)
  const start = startDate.toISOString().slice(0, 10)
  const pages = Math.max(1, Math.ceil((count ?? 0) / pageSize))

  return (
    <main className="p-5 text-slate-950 lg:p-8">
      <h1 className="text-3xl font-bold">Reports</h1>
      <p className="mt-2 text-slate-500">Generate auditable summaries and downloadable detail snapshots.</p>

      {(params.error || error) && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-800">{params.error ? decodeURIComponent(params.error) : error?.message}</p>}
      {params.generated && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Report generated successfully.</p>}
      {params.deleted && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">Report deleted.</p>}

      <form action={generateReport} className="mt-7 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_1fr_auto] md:items-end">
        <label className="text-sm font-medium text-slate-700">
          Report
          <select name="type" className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100">
            <option value="sales">Successful sales</option>
            <option value="orders">Orders</option>
            <option value="customers">New customers</option>
            <option value="inventory">Current inventory snapshot</option>
            <option value="repairs">Repair bookings</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Start
          <input name="start" type="date" defaultValue={start} max={today} required className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100" />
        </label>
        <label className="text-sm font-medium text-slate-700">
          End
          <input name="end" type="date" defaultValue={today} max={today} required className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 outline-none focus:border-purple-600 focus:ring-2 focus:ring-purple-100" />
        </label>
        <button className="h-11 rounded-xl bg-purple-700 px-5 text-sm font-semibold text-white hover:bg-purple-800">Generate report</button>
      </form>
      <p className="mt-2 text-xs text-slate-500">Date-based reports use Africa/Lagos boundaries. Inventory always records the current state.</p>

      <div className="mt-7 space-y-4">
        {data?.map((report) => <ReportCard key={report.id} report={report} />)}
        {!data?.length && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-500">No saved reports yet.</div>}
      </div>

      {pages > 1 && (
        <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Report pages">
          <Link aria-disabled={page <= 1} href={`/admin/reports?page=${Math.max(1, page - 1)}`} className={`rounded-lg border px-4 py-2 ${page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-white"}`}>Previous</Link>
          <span className="text-slate-500">Page {page} of {pages}</span>
          <Link aria-disabled={page >= pages} href={`/admin/reports?page=${Math.min(pages, page + 1)}`} className={`rounded-lg border px-4 py-2 ${page >= pages ? "pointer-events-none opacity-40" : "hover:bg-white"}`}>Next</Link>
        </nav>
      )}
    </main>
  )
}
