import { describe, expect, it } from "vitest"

import { lagosDateBounds, reportRequestSchema, reportToCsv, type ReportData } from "./reports"

describe("admin reporting", () => {
  it("validates report dates and range", () => {
    expect(reportRequestSchema.safeParse({ type: "sales", start: "2026-07-01", end: "2026-07-31" }).success).toBe(true)
    expect(reportRequestSchema.safeParse({ type: "sales", start: "2026-08-01", end: "2026-07-31" }).success).toBe(false)
    expect(reportRequestSchema.safeParse({ type: "orders", start: "2024-01-01", end: "2026-01-01" }).success).toBe(false)
  })

  it("uses Lagos day boundaries with an exclusive next-day end", () => {
    expect(lagosDateBounds("2026-07-01", "2026-07-03")).toEqual({
      from: "2026-07-01T00:00:00+01:00",
      toExclusive: "2026-07-04T00:00:00+01:00",
    })
  })

  it("creates escaped CSV output in declared column order", () => {
    const report: ReportData = {
      version: 1,
      generatedAt: "2026-07-03T00:00:00Z",
      timezone: "Africa/Lagos",
      summary: { rows: 1 },
      columns: ["name", "amount"],
      rows: [{ name: 'Phone, "Pro"', amount: 120000 }],
    }
    expect(reportToCsv(report)).toBe('"name","amount"\r\n"Phone, ""Pro""","120000"')
  })
})
