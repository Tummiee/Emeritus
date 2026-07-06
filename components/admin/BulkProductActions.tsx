"use client"

import { useState } from "react"
import { ArchiveX, Trash2, X } from "lucide-react"

import { deactivateAllProducts, deleteAllProducts } from "@/lib/admin/bulk-product-actions"
import { DELETE_ALL_PRODUCTS_CONFIRMATION } from "@/lib/admin/bulk-products"

export function BulkProductActions({ count }: { count: number }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")

  if (count === 0) return null

  return (
    <>
      <form
        action={deactivateAllProducts}
        onSubmit={(event) => {
          if (!window.confirm(`Deactivate all ${count} products? They will disappear from the storefront but remain editable.`)) {
            event.preventDefault()
          }
        }}
      >
        <button className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800">
          <ArchiveX className="size-4" />
          Deactivate all
        </button>
      </form>
      <button
        type="button"
        onClick={() => setDeleteOpen(true)}
        className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700"
      >
        <Trash2 className="size-4" />
        Delete all
      </button>

      {deleteOpen && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-products-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="delete-products-title" className="text-xl font-bold text-slate-950">Permanently delete all products?</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This will delete {count} products, their inventory, reviews, wishlist references, and managed product images.
                  Historical order line items will remain unchanged.
                </p>
              </div>
              <button type="button" onClick={() => setDeleteOpen(false)} aria-label="Close" className="rounded-lg border p-2 text-slate-500">
                <X className="size-4" />
              </button>
            </div>
            <form action={deleteAllProducts} className="mt-6">
              <label className="text-sm font-medium text-slate-800">
                Type <strong>{DELETE_ALL_PRODUCTS_CONFIRMATION}</strong> to continue
                <input
                  name="confirmation"
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-300 px-3 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                />
              </label>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setDeleteOpen(false)} className="rounded-xl border px-4 py-2.5 text-sm font-semibold">
                  Cancel
                </button>
                <button
                  disabled={confirmation.trim() !== DELETE_ALL_PRODUCTS_CONFIRMATION}
                  className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Permanently delete all
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
