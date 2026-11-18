import { describe, expect, it } from "vitest"

import {
  isPromotionCurrentlyActive,
  isValidSalePrice,
  resolveProductImage,
} from "./promotions"

describe("promotion availability", () => {
  const now = new Date("2026-07-04T12:00:00Z").getTime()

  it("accepts a published campaign inside its window", () => {
    expect(isPromotionCurrentlyActive({
      starts_at: "2026-07-04T10:00:00Z",
      ends_at: "2026-07-05T10:00:00Z",
      productCount: 2,
    }, now)).toBe(true)
  })

  it("rejects scheduled, expired, and empty campaigns", () => {
    expect(isPromotionCurrentlyActive({ starts_at: "2026-07-05T10:00:00Z", ends_at: null, productCount: 1 }, now)).toBe(false)
    expect(isPromotionCurrentlyActive({ starts_at: null, ends_at: "2026-07-04T10:00:00Z", productCount: 1 }, now)).toBe(false)
    expect(isPromotionCurrentlyActive({ starts_at: null, ends_at: null, productCount: 0 }, now)).toBe(false)
  })
})

describe("promotion prices", () => {
  it("allows an omitted price or a price below regular retail", () => {
    expect(isValidSalePrice(null, 1000)).toBe(true)
    expect(isValidSalePrice(750, 1000)).toBe(true)
  })

  it("rejects negative, equal, higher, and invalid prices", () => {
    expect(isValidSalePrice(-1, 1000)).toBe(false)
    expect(isValidSalePrice(1000, 1000)).toBe(false)
    expect(isValidSalePrice(1200, 1000)).toBe(false)
    expect(isValidSalePrice(Number.NaN, 1000)).toBe(false)
  })
})

describe("offer product images", () => {
  it("uses the image saved on the product", () => {
    expect(resolveProductImage("https://cdn.example.com/product.webp")).toBe("https://cdn.example.com/product.webp")
  })

  it("uses a placeholder only when the product has no image", () => {
    expect(resolveProductImage(null)).toBe("/product-placeholder.svg")
    expect(resolveProductImage("   ")).toBe("/product-placeholder.svg")
  })
})
