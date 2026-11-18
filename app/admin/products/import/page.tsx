"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { AlertCircle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react"

type Mode = "create" | "update" | "upsert"
type PreviewRow = {
  rowNumber: number
  source: Record<string, string>
  action: "create" | "update" | "skip"
  errors: string[]
  warnings: string[]
}

type Summary = { total: number; valid: number; invalid: number; skipped: number }
type ImportResults = {
  created: number
  updated: number
  skipped: number
  failed: number
  errors: Array<{ rowNumber: number; sku: string; error: string }>
}

export default function ProductImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<Mode>("upsert")
  const [createMissing, setCreateMissing] = useState(false)
  const [rows, setRows] = useState<PreviewRow[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [results, setResults] = useState<ImportResults | null>(null)
  const [error, setError] = useState("")
  const [pending, setPending] = useState<"preview" | "import" | null>(null)
  const canImport = useMemo(() => summary && summary.invalid === 0 && summary.valid > 0, [summary])

  const resetPreview = () => {
    setRows([])
    setSummary(null)
    setResults(null)
    setError("")
  }

  const preview = async () => {
    if (!file) return
    setPending("preview")
    setError("")
    setResults(null)
    try {
      const form = new FormData()
      form.set("file", file)
      form.set("mode", mode)
      form.set("createMissing", String(createMissing))
      const response = await fetch("/api/admin/products/import", { method: "POST", body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setRows(data.rows)
      setSummary(data.summary)
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : "Could not preview this file.")
    } finally {
      setPending(null)
    }
  }

  const importProducts = async () => {
    setPending("import")
    setError("")
    try {
      const response = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, createMissing, rows: rows.map((row) => row.source) }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResults(data.results)
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "The import could not be completed.")
    } finally {
      setPending(null)
    }
  }

  const downloadErrors = () => {
    if (!results?.errors.length) return
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const csv = ["row,sku,error", ...results.errors.map((item) => [item.rowNumber, item.sku, item.error].map(escape).join(","))].join("\n")
    const link = document.createElement("a")
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
    link.download = "product-import-errors.csv"
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return (
    <main className="p-5 lg:p-8">
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950">
        <ArrowLeft className="size-4" /> Products
      </Link>
      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Catalog operations</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Import products</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Upload a CSV, review every change, then confirm the valid rows.</p>
        </div>
        <a href="/product-import-template.csv" download className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">
          <Download className="size-4" /> Download template
        </a>
      </div>

      <section className="mt-7 border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-[1fr_220px_260px_auto] lg:items-end">
          <label className="text-sm font-medium">
            CSV file
            <span className="mt-1.5 flex h-11 items-center gap-2 rounded-xl border border-slate-200 px-3">
              <FileSpreadsheet className="size-4 text-slate-400" />
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null)
                  resetPreview()
                }}
                className="min-w-0 flex-1 text-sm"
              />
            </span>
          </label>
          <label className="text-sm font-medium">
            Import mode
            <select
              value={mode}
              onChange={(event) => {
                setMode(event.target.value as Mode)
                resetPreview()
              }}
              className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
            >
              <option value="upsert">Create and update</option>
              <option value="create">Create only</option>
              <option value="update">Update only</option>
            </select>
          </label>
          <label className="flex h-11 items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm">
            <input
              type="checkbox"
              checked={createMissing}
              onChange={(event) => {
                setCreateMissing(event.target.checked)
                resetPreview()
              }}
              className="size-4 accent-primary"
            />
            Create missing categories and brands
          </label>
          <button
            type="button"
            onClick={preview}
            disabled={!file || pending !== null}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Upload className="size-4" /> {pending === "preview" ? "Checking..." : "Preview"}
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Maximum 500 products and 2 MB per import. SKU determines whether a product already exists.</p>
      </section>

      {error && <p className="mt-5 flex items-start gap-2 border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert"><AlertCircle className="mt-0.5 size-4 shrink-0" />{error}</p>}

      {summary && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[["Rows", summary.total], ["Ready", summary.valid], ["Invalid", summary.invalid], ["Skipped", summary.skipped]].map(([label, value]) => (
              <div key={label} className="border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
            ))}
          </div>
          <div className="mt-4 overflow-hidden border border-slate-200 bg-white">
            <div className="max-h-[560px] overflow-auto">
              <table className="w-full min-w-[900px] text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 border-b">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Row</th>
                    <th className="px-6 py-4 font-semibold">SKU</th>
                    <th className="px-6 py-4 font-semibold">Product</th>
                    <th className="px-6 py-4 font-semibold">Category</th>
                    <th className="px-6 py-4 font-semibold">Brand</th>
                    <th className="px-6 py-4 font-semibold">Action</th>
                    <th className="px-6 py-4 font-semibold">Validation</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.rowNumber} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50/50 transition">
                      <td className="px-6 py-5 text-slate-500">{row.rowNumber}</td>
                      <td className="px-6 py-5 font-mono text-xs whitespace-nowrap">{row.source.sku}</td>
                      <td className="px-6 py-5 font-medium text-slate-900">{row.source.name}</td>
                      <td className="px-6 py-5 text-slate-600">{row.source.category || "None"}</td>
                      <td className="px-6 py-5 text-slate-600">{row.source.brand || "None"}</td>
                      <td className="px-6 py-5 capitalize text-slate-600">{row.action}</td>
                      <td className="max-w-md px-6 py-5">
                        {row.errors.map((message) => <p key={message} className="text-xs text-red-700 font-medium leading-relaxed">{message}</p>)}
                        {row.warnings.map((message) => <p key={message} className="text-xs text-amber-700 font-medium leading-relaxed">{message}</p>)}
                        {!row.errors.length && !row.warnings.length && <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded-md">Ready</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-slate-50 p-4">
              <p className="text-sm text-slate-600">{summary.invalid ? "Correct invalid rows and upload the CSV again." : `${summary.valid} products are ready to import.`}</p>
              <button
                type="button"
                onClick={importProducts}
                disabled={!canImport || pending !== null || Boolean(results)}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending === "import" ? "Importing..." : "Confirm import"}
              </button>
            </div>
          </div>
        </>
      )}

      {results && (
        <section className="mt-6 border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 size-5 text-emerald-700" /><div><h2 className="font-semibold text-emerald-950">Import completed</h2><p className="mt-1 text-sm text-emerald-800">{results.created} created, {results.updated} updated, {results.skipped} skipped, {results.failed} failed.</p></div></div>
          <div className="mt-4 flex gap-3">
            <Link href="/admin/products" className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">View products</Link>
            {results.errors.length > 0 && <button type="button" onClick={downloadErrors} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-900"><Download className="size-4" /> Error CSV</button>}
          </div>
        </section>
      )}
    </main>
  )
}
