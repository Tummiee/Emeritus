"use client";
import { deactivateAllProducts } from "@/lib/admin/bulk-product-actions";
export function BulkProductActions({ count }: { count: number }) {
  return (
    <form
      action={deactivateAllProducts}
      onSubmit={(event) => {
        if (!window.confirm(`Archive all ${count} products?`))
          event.preventDefault();
      }}
    >
      <button
        type="submit"
        className="rounded border px-3 py-2 text-sm"
        disabled={!count}
      >
        Archive all products
      </button>
    </form>
  );
}
