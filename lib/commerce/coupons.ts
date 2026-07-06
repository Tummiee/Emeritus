export type DiscountType = "percentage" | "fixed";

export function calculateDiscount(
  cartTotal: number,
  discountType: DiscountType,
  discountValue: number,
) {
  if (!Number.isFinite(cartTotal) || cartTotal <= 0) return 0;
  if (!Number.isFinite(discountValue) || discountValue <= 0) return 0;

  const rawDiscount =
    discountType === "percentage"
      ? cartTotal * (Math.min(discountValue, 100) / 100)
      : discountValue;

  return Math.min(cartTotal, rawDiscount);
}
