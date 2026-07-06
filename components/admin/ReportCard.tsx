"use client"

import { Download, Trash2 } from "lucide-react"

import { deleteReport } from "@/lib/admin/operations"
import { isReportData, reportToCsv } from "@/lib/admin/reports"

export function ReportCard({
  report,
}: {
  report: { id: string; name: string; report_type: string; created_at: string; data: unknown }
}) {
  const structured = isReportData(report.data) ? report.data : null

  function download() {
    if (!structured) return
    const blob = new Blob([reportToCsv(structured)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${report.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold capitalize text-purple-700">{report.report_type}</span>
          <h2 className="mt-2 font-semibold text-slate-950">{report.name}</h2>
          <p className="mt-1 text-xs text-slate-500">{new Date(report.created_at).toLocaleString("en-NG")}</p>
        </div>
        <div className="flex gap-2">
          {structured && (
            <button type="button" onClick={download} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
              <Download className="size-4" /> CSV
            </button>
          )}
          <form action={deleteReport} onSubmit={(event) => {
            if (!window.confirm("Permanently delete this saved report?")) event.preventDefault()
          }}>
            <input type="hidden" name="id" value={report.id} />
            <button aria-label="Delete report" className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50">
              <Trash2 className="size-4" />
            </button>
          </form>
        </div>
      </div>

      {structured ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(structured.summary).map(([label, value]) => (
              <div key={label} className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs capitalize text-slate-500">{label.replaceAll(/([A-Z])/g, " $1")}</p>
                <p className="mt-1 truncate font-semibold text-slate-950" title={String(value ?? "")}>{String(value ?? "—")}</p>
              </div>
            ))}
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-semibold text-purple-700">
              View {structured.rows.length} detailed rows
            </summary>
            <div className="mt-3 max-h-[32rem] overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full whitespace-nowrap text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 text-slate-600">
                  <tr>{structured.columns.map((column) => <th key={column} className="px-3 py-2 font-semibold">{column}</th>)}</tr>
                </thead>
                <tbody>
                  {structured.rows.map((row, index) => (
                    <tr key={index} className="border-t border-slate-100">
                      {structured.columns.map((column) => <td key={column} className="px-3 py-2 text-slate-700">{String(row[column] ?? "—")}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!structured.rows.length && <p className="p-8 text-center text-sm text-slate-500">No records in this period.</p>}
            </div>
          </details>
        </>
      ) : (
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-semibold text-purple-700">View legacy JSON snapshot</summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(report.data, null, 2)}</pre>
        </details>
      )}
    </article>
  )
}
