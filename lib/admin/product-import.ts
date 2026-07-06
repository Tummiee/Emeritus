export const productImportColumns = [
  "name",
  "slug",
  "sku",
  "description",
  "category",
  "brand",
  "price",
  "compare_at_price",
  "cost_price",
  "stock",
  "low_stock_threshold",
  "image_url",
  "featured",
  "active",
  "seo_title",
  "seo_description",
] as const

export type ProductImportRow = Record<(typeof productImportColumns)[number], string>

export function parseCsv(input: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index]
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"') {
      quoted = true
    } else if (character === ",") {
      row.push(field.trim())
      field = ""
    } else if (character === "\n") {
      row.push(field.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      field = ""
    } else if (character !== "\r") {
      field += character
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quoted value.")
  row.push(field.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function csvToProductRows(input: string): ProductImportRow[] {
  const records = parseCsv(input.replace(/^\uFEFF/, ""))
  if (!records.length) throw new Error("The CSV file is empty.")
  const headers = records[0].map((header) => header.trim().toLowerCase())
  const missing = ["name", "slug", "sku", "price"].filter((column) => !headers.includes(column))
  if (missing.length) throw new Error(`Missing required columns: ${missing.join(", ")}.`)

  return records.slice(1).map((record) => {
    const row = Object.fromEntries(productImportColumns.map((column) => {
      const index = headers.indexOf(column)
      return [column, index >= 0 ? String(record[index] ?? "").trim() : ""]
    }))
    return row as ProductImportRow
  })
}

export function parseBoolean(value: string, defaultValue: boolean) {
  if (!value) return defaultValue
  const normalized = value.toLowerCase()
  if (["true", "yes", "1", "active"].includes(normalized)) return true
  if (["false", "no", "0", "inactive"].includes(normalized)) return false
  return null
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
}
