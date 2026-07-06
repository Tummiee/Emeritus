import "server-only"

import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js"

import { lagosDateBounds, type ReportData, type ReportType } from "./reports"

type QueryResult<T> = { data: T[] | null; error: PostgrestError | null }

async function allRows<T>(query: (from: number, to: number) => PromiseLike<QueryResult<T>>) {
  const rows: T[] = []
  const size = 1000
  for (let from = 0; ; from += size) {
    const { data, error } = await query(from, from + size - 1)
    if (error) throw new Error(error.message)
    const page = data ?? []
    rows.push(...page)
    if (page.length < size) return rows
  }
}

function base(summary: ReportData["summary"], columns: string[], rows: ReportData["rows"]): ReportData {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    timezone: "Africa/Lagos",
    summary,
    columns,
    rows,
  }
}

export async function generateReportData(
  supabase: SupabaseClient,
  type: ReportType,
  start: string,
  end: string,
): Promise<ReportData> {
  const { from, toExclusive } = lagosDateBounds(start, end)

  if (type === "sales") {
    const payments = await allRows<{ order_id: string; reference: string; amount: number | string; currency: string; created_at: string }>((rangeStart, rangeEnd) =>
      supabase.from("payment_attempts")
        .select("order_id,reference,amount,currency,created_at")
        .eq("status", "successful")
        .gte("created_at", from)
        .lt("created_at", toExclusive)
        .order("created_at")
        .range(rangeStart, rangeEnd),
    )
    const orderIds = [...new Set(payments.map((payment) => payment.order_id))]
    const orders: Array<{ id: string; order_number: string; subtotal: number | string; shipping: number | string; discount: number | string; total: number | string }> = []
    const items: Array<{ order_id: string; name: string; quantity: number; unit_price: number | string }> = []
    for (let index = 0; index < orderIds.length; index += 200) {
      const ids = orderIds.slice(index, index + 200)
      if (!ids.length) continue
      const [{ data: orderPage, error: orderError }, { data: itemPage, error: itemError }] = await Promise.all([
        supabase.from("orders").select("id,order_number,subtotal,shipping,discount,total").in("id", ids),
        supabase.from("order_items").select("order_id,name,quantity,unit_price").in("order_id", ids),
      ])
      if (orderError) throw new Error(orderError.message)
      if (itemError) throw new Error(itemError.message)
      orders.push(...(orderPage ?? []))
      items.push(...(itemPage ?? []))
    }
    const orderById = new Map(orders.map((order) => [order.id, order]))
    const productUnits = new Map<string, number>()
    items.forEach((item) => productUnits.set(item.name, (productUnits.get(item.name) ?? 0) + item.quantity))
    const topProduct = [...productUnits.entries()].sort((a, b) => b[1] - a[1])[0]
    const total = (key: "amount" | "discount" | "shipping") => key === "amount"
      ? payments.reduce((sum, payment) => sum + Number(payment.amount), 0)
      : orders.reduce((sum, order) => sum + Number(order[key]), 0)
    const rows = payments.map((payment) => {
      const order = orderById.get(payment.order_id)
      return {
        paymentDate: payment.created_at,
        reference: payment.reference,
        orderNumber: order?.order_number ?? "",
        subtotal: Number(order?.subtotal ?? payment.amount),
        discount: Number(order?.discount ?? 0),
        shipping: Number(order?.shipping ?? 0),
        collected: Number(payment.amount),
        currency: payment.currency,
      }
    })
    return base(
      {
        successfulPayments: payments.length,
        netCollected: total("amount"),
        discounts: total("discount"),
        shipping: total("shipping"),
        unitsSold: items.reduce((sum, item) => sum + item.quantity, 0),
        topProduct: topProduct ? `${topProduct[0]} (${topProduct[1]})` : "None",
      },
      ["paymentDate", "reference", "orderNumber", "subtotal", "discount", "shipping", "collected", "currency"],
      rows,
    )
  }

  if (type === "orders") {
    const orders = await allRows<{ order_number: string; status: string; subtotal: number | string; shipping: number | string; discount: number | string; total: number | string; currency: string; created_at: string }>((rangeStart, rangeEnd) =>
      supabase.from("orders").select("order_number,status,subtotal,shipping,discount,total,currency,created_at")
        .gte("created_at", from).lt("created_at", toExclusive).order("created_at").range(rangeStart, rangeEnd),
    )
    const statusCounts = orders.reduce<Record<string, number>>((counts, order) => {
      counts[order.status] = (counts[order.status] ?? 0) + 1
      return counts
    }, {})
    return base(
      { orders: orders.length, orderValue: orders.reduce((sum, order) => sum + Number(order.total), 0), ...statusCounts },
      ["createdAt", "orderNumber", "status", "subtotal", "discount", "shipping", "total", "currency"],
      orders.map((order) => ({
        createdAt: order.created_at,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: Number(order.subtotal),
        discount: Number(order.discount),
        shipping: Number(order.shipping),
        total: Number(order.total),
        currency: order.currency,
      })),
    )
  }

  if (type === "customers") {
    const customers = await allRows<{ first_name: string; last_name: string; role: string; created_at: string }>((rangeStart, rangeEnd) =>
      supabase.from("profiles").select("first_name,last_name,role,created_at")
        .eq("role", "customer").gte("created_at", from).lt("created_at", toExclusive).order("created_at").range(rangeStart, rangeEnd),
    )
    return base(
      { newCustomers: customers.length },
      ["joinedAt", "name", "role"],
      customers.map((customer) => ({
        joinedAt: customer.created_at,
        name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || "Customer",
        role: customer.role,
      })),
    )
  }

  if (type === "inventory") {
    const inventory = await allRows<{ quantity: number; reserved: number; low_stock_threshold: number; products: { name: string; sku: string; active: boolean } | Array<{ name: string; sku: string; active: boolean }> | null }>((rangeStart, rangeEnd) =>
      supabase.from("inventory").select("quantity,reserved,low_stock_threshold,products(name,sku,active)")
        .order("updated_at").range(rangeStart, rangeEnd),
    )
    const rows = inventory.map((item) => {
      const product = Array.isArray(item.products) ? item.products[0] : item.products
      const available = item.quantity - item.reserved
      return {
        sku: product?.sku ?? "",
        product: product?.name ?? "Deleted product",
        active: product?.active ?? false,
        quantity: item.quantity,
        reserved: item.reserved,
        available,
        threshold: item.low_stock_threshold,
        stockStatus: available === 0 ? "out-of-stock" : available <= item.low_stock_threshold ? "low-stock" : "in-stock",
      }
    })
    return base(
      {
        products: rows.length,
        totalUnits: rows.reduce((sum, row) => sum + Number(row.available), 0),
        lowStock: rows.filter((row) => row.stockStatus === "low-stock").length,
        outOfStock: rows.filter((row) => row.stockStatus === "out-of-stock").length,
      },
      ["sku", "product", "active", "quantity", "reserved", "available", "threshold", "stockStatus"],
      rows,
    )
  }

  const repairs = await allRows<{ reference: string; brand: string; device: string; status: string; booking_date: string; booking_time: string; created_at: string; updated_at: string }>((rangeStart, rangeEnd) =>
    supabase.from("repair_requests").select("reference,brand,device,status,booking_date,booking_time,created_at,updated_at")
      .gte("created_at", from).lt("created_at", toExclusive).order("created_at").range(rangeStart, rangeEnd),
  )
  const repairStatuses = repairs.reduce<Record<string, number>>((counts, repair) => {
    counts[repair.status] = (counts[repair.status] ?? 0) + 1
    return counts
  }, {})
  return base(
    { bookings: repairs.length, ...repairStatuses },
    ["createdAt", "reference", "device", "status", "appointment", "updatedAt"],
    repairs.map((repair) => ({
      createdAt: repair.created_at,
      reference: repair.reference,
      device: `${repair.brand} ${repair.device}`.trim(),
      status: repair.status,
      appointment: `${repair.booking_date} ${String(repair.booking_time).slice(0, 5)}`,
      updatedAt: repair.updated_at,
    })),
  )
}
