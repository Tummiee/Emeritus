import { NextResponse } from "next/server"
import { z } from "zod"

import {
  csvToProductRows,
  parseBoolean,
  productImportColumns,
  slugify,
  type ProductImportRow,
} from "@/lib/admin/product-import"
import { createClient } from "@/lib/supabase/server"

type ImportMode = "create" | "update" | "upsert"
type Lookup = { id: string; name?: string; sku?: string; slug?: string }

type PreviewRow = {
  rowNumber: number
  source: ProductImportRow
  action: "create" | "update" | "skip"
  errors: string[]
  warnings: string[]
}

async function adminClient() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Authentication required." }, { status: 401 }) }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (!["admin", "super_admin"].includes(profile?.role)) {
    return { error: NextResponse.json({ error: "Administrator access required." }, { status: 403 }) }
  }
  return { supabase }
}

function numberValue(value: string, label: string, errors: string[], options: { required?: boolean; integer?: boolean } = {}) {
  if (!value && !options.required) return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0 || (options.integer && !Number.isInteger(number))) {
    errors.push(`${label} must be a non-negative ${options.integer ? "whole number" : "number"}.`)
    return null
  }
  return number
}

async function analyze(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: ProductImportRow[],
  mode: ImportMode,
  createMissing: boolean,
) {
  const [{ data: categories }, { data: brands }, { data: products }] = await Promise.all([
    supabase.from("categories").select("id,name"),
    supabase.from("brands").select("id,name"),
    supabase.from("products").select("id,sku,slug").range(0, 4999),
  ])
  const categoryMap = new Map((categories ?? []).map((item: Lookup) => [item.name!.toLowerCase(), item]))
  const brandMap = new Map((brands ?? []).map((item: Lookup) => [item.name!.toLowerCase(), item]))
  const skuMap = new Map((products ?? []).map((item: Lookup) => [item.sku!.toLowerCase(), item]))
  const slugMap = new Map((products ?? []).map((item: Lookup) => [item.slug!.toLowerCase(), item]))
  const fileSkus = new Set<string>()
  const fileSlugs = new Set<string>()

  const preview: PreviewRow[] = rows.map((source, index) => {
    const errors: string[] = []
    const warnings: string[] = []
    const sku = source.sku.trim().toUpperCase()
    const slug = slugify(source.slug)
    const existing = skuMap.get(sku.toLowerCase())

    if (!source.name.trim()) errors.push("Name is required.")
    if (!sku) errors.push("SKU is required.")
    if (!slug) errors.push("Slug is required.")
    numberValue(source.price, "Price", errors, { required: true })
    numberValue(source.compare_at_price, "Compare-at price", errors)
    numberValue(source.cost_price, "Cost price", errors)
    numberValue(source.stock || "0", "Stock", errors, { integer: true })
    numberValue(source.low_stock_threshold || "5", "Low-stock threshold", errors, { integer: true })
    if (parseBoolean(source.featured, false) === null) errors.push("Featured must be true or false.")
    if (parseBoolean(source.active, true) === null) errors.push("Active must be true or false.")
    if (source.image_url) {
      try { new URL(source.image_url) } catch { errors.push("Image URL is invalid.") }
    }

    if (fileSkus.has(sku.toLowerCase())) errors.push("SKU is duplicated in this file.")
    if (fileSlugs.has(slug)) errors.push("Slug is duplicated in this file.")
    fileSkus.add(sku.toLowerCase())
    fileSlugs.add(slug)

    const conflictingSlug = slugMap.get(slug)
    if (conflictingSlug && conflictingSlug.id !== existing?.id) errors.push("Slug belongs to another product.")

    for (const [label, value, lookup] of [
      ["Category", source.category, categoryMap],
      ["Brand", source.brand, brandMap],
    ] as const) {
      if (value && !lookup.has(value.toLowerCase())) {
        if (createMissing) warnings.push(`${label} "${value}" will be created.`)
        else errors.push(`${label} "${value}" does not exist.`)
      }
    }

    let action: PreviewRow["action"] = existing ? "update" : "create"
    if (mode === "create" && existing) {
      action = "skip"
      warnings.push("SKU already exists and create-only mode will skip it.")
    }
    if (mode === "update" && !existing) {
      action = "skip"
      warnings.push("SKU does not exist and update-only mode will skip it.")
    }
    return { rowNumber: index + 2, source: { ...source, sku, slug }, action, errors, warnings }
  })
  return { preview, categoryMap, brandMap, skuMap }
}

const optionsSchema = z.object({
  mode: z.enum(["create", "update", "upsert"]).default("upsert"),
  createMissing: z.boolean().default(false),
})

export async function POST(request: Request) {
  const authorized = await adminClient()
  if ("error" in authorized) return authorized.error
  const { supabase } = authorized

  try {
    const contentType = request.headers.get("content-type") ?? ""
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData()
      const file = form.get("file")
      if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV file." }, { status: 400 })
      if (file.size > 2_000_000) return NextResponse.json({ error: "CSV files must be 2 MB or smaller." }, { status: 400 })
      const options = optionsSchema.parse({
        mode: form.get("mode") || "upsert",
        createMissing: form.get("createMissing") === "true",
      })
      const rows = csvToProductRows(await file.text())
      if (rows.length > 500) return NextResponse.json({ error: "Import at most 500 products at a time." }, { status: 400 })
      const { preview } = await analyze(supabase, rows, options.mode, options.createMissing)
      return NextResponse.json({
        success: true,
        rows: preview,
        summary: {
          total: preview.length,
          valid: preview.filter((row) => !row.errors.length && row.action !== "skip").length,
          invalid: preview.filter((row) => row.errors.length).length,
          skipped: preview.filter((row) => row.action === "skip").length,
        },
      })
    }

    const payload = z.object({
      mode: z.enum(["create", "update", "upsert"]),
      createMissing: z.boolean(),
      rows: z.array(z.record(z.string(), z.string())).min(1).max(500),
    }).parse(await request.json())
    const rows = payload.rows.map((row) => Object.fromEntries(productImportColumns.map((column) => [column, row[column] ?? ""])) as ProductImportRow)
    const analysis = await analyze(supabase, rows, payload.mode, payload.createMissing)
    if (analysis.preview.some((row) => row.errors.length)) {
      return NextResponse.json({ error: "The import contains invalid rows. Preview the corrected file again." }, { status: 400 })
    }

    const results = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] as Array<{ rowNumber: number; sku: string; error: string }> }
    for (const row of analysis.preview) {
      if (row.action === "skip") {
        results.skipped += 1
        continue
      }
      try {
        const source = row.source
        const resolveLookup = async (type: "category" | "brand", name: string) => {
          if (!name) return null
          const map = type === "category" ? analysis.categoryMap : analysis.brandMap
          const found = map.get(name.toLowerCase())
          if (found) return found.id
          if (!payload.createMissing) return null
          const table = type === "category" ? "categories" : "brands"
          const { data, error } = await supabase.from(table).insert({ name, slug: slugify(name), active: true }).select("id,name").single()
          if (error) throw error
          map.set(name.toLowerCase(), data)
          return data.id
        }
        const categoryId = await resolveLookup("category", source.category)
        const brandId = await resolveLookup("brand", source.brand)
        const values = {
          name: source.name.trim(),
          slug: source.slug,
          sku: source.sku,
          description: source.description,
          category_id: categoryId,
          brand_id: brandId,
          price: Number(source.price),
          compare_at_price: source.compare_at_price ? Number(source.compare_at_price) : null,
          cost_price: source.cost_price ? Number(source.cost_price) : null,
          image_url: source.image_url || null,
          featured: parseBoolean(source.featured, false),
          active: parseBoolean(source.active, true),
          seo_title: source.seo_title || null,
          seo_description: source.seo_description || null,
        }
        const existing = analysis.skuMap.get(source.sku.toLowerCase())
        const productResult = existing
          ? await supabase.from("products").update(values).eq("id", existing.id).select("id").single()
          : await supabase.from("products").insert(values).select("id").single()
        if (productResult.error) throw productResult.error
        const productId = productResult.data.id
        const inventoryValues = {
          quantity: Number(source.stock || 0),
          low_stock_threshold: Number(source.low_stock_threshold || 5),
        }
        const inventoryResult = await supabase.from("inventory").update(inventoryValues).eq("product_id", productId)
        if (inventoryResult.error) throw inventoryResult.error
        existing ? results.updated += 1 : results.created += 1
      } catch (error) {
        results.failed += 1
        results.errors.push({
          rowNumber: row.rowNumber,
          sku: row.source.sku,
          error: error instanceof Error ? error.message : "Import failed.",
        })
      }
    }
    return NextResponse.json({ success: results.failed === 0, results })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not process the import."
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
