import { describe, expect, it } from "vitest"

import { DELETE_ALL_PRODUCTS_CONFIRMATION, isDeleteAllProductsConfirmed } from "./bulk-products"

describe("bulk product deletion confirmation", () => {
  it("requires the exact confirmation phrase", () => {
    expect(isDeleteAllProductsConfirmed(DELETE_ALL_PRODUCTS_CONFIRMATION)).toBe(true)
    expect(isDeleteAllProductsConfirmed("delete all products")).toBe(false)
    expect(isDeleteAllProductsConfirmed(null)).toBe(false)
  })

  it("ignores surrounding whitespace", () => {
    expect(isDeleteAllProductsConfirmed(`  ${DELETE_ALL_PRODUCTS_CONFIRMATION}  `)).toBe(true)
  })
})
