import { z } from "zod"

export const reportRequestSchema = z.object({
  type: z.enum(["sales", "orders", "customers", "inventory", "repairs"]),
  start: z.iso.date(),
  end: z.iso.date(),
}).refine((value) => value.start <= value.end, {
  message: "Start date must be on or before end date",
}).refine((value) => {
  const days = (Date.parse(value.end) - Date.parse(value.start)) / 86_400_000
  return days <= 366
}, { message: "Report range cannot exceed 367 days" })

export type ReportType = z.infer<typeof reportRequestSchema>["type"]
export type ReportCell = string | number | boolean | null

export type ReportData = {
  version: 1
  generatedAt: string
  timezone: "Africa/Lagos"
  summary: Record<string, ReportCell>
  columns: string[]
  rows: Array<Record<string, ReportCell>>
}

export function lagosDateBounds(start: string, end: string) {
  const next = new Date(`${end}T00:00:00Z`)
  next.setUTCDate(next.getUTCDate() + 1)
  return {
    from: `${start}T00:00:00+01:00`,
    toExclusive: `${next.toISOString().slice(0, 10)}T00:00:00+01:00`,
  }
}

function csvCell(value: ReportCell) {
  const text = value == null ? "" : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function reportToCsv(report: ReportData) {
  return [
    report.columns.map(csvCell).join(","),
    ...report.rows.map((row) => report.columns.map((column) => csvCell(row[column] ?? null)).join(",")),
  ].join("\r\n")
}

export function isReportData(value: unknown): value is ReportData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false
  const candidate = value as Partial<ReportData>
  return candidate.version === 1 && Array.isArray(candidate.columns) && Array.isArray(candidate.rows) && Boolean(candidate.summary)
}
