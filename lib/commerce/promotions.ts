export function isPromotionCurrentlyActive(
  promotion: {
    starts_at: string | null
    ends_at: string | null
    productCount: number
  },
  now = Date.now(),
) {
  if (promotion.productCount < 1) return false
  if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) return false
  if (promotion.ends_at && new Date(promotion.ends_at).getTime() <= now) return false
  return true
}

export function isValidSalePrice(salePrice: number | null, regularPrice: number) {
  return salePrice === null || (
    Number.isFinite(salePrice) &&
    salePrice >= 0 &&
    salePrice < regularPrice
  )
}

export function resolveProductImage(
  productImage: string | null | undefined,
  fallback = "/product-placeholder.svg",
) {
  return productImage?.trim() || fallback
}
