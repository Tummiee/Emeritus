import type { CartItemUI } from "./types";
export function parseCart(raw: string | null): CartItemUI[] {
  try {
    const parsed: unknown = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (value): value is CartItemUI =>
        !!value &&
        typeof value === "object" &&
        typeof value.productId === "string" &&
        /^[0-9a-f-]{36}$/i.test(value.productId) &&
        typeof value.name === "string" &&
        typeof value.image === "string" &&
        Number.isFinite(value.price) &&
        value.price >= 0 &&
        Number.isInteger(value.quantity) &&
        value.quantity >= 1 &&
        value.quantity <= 99,
    );
    return [
      ...new Map(
        valid.slice(0, 100).map((item) => [item.productId, item]),
      ).values(),
    ];
  } catch {
    return [];
  }
}
export function mergeCart(base: CartItemUI[], incoming: CartItemUI[]) {
  const result = new Map(base.map((item) => [item.productId, item]));
  for (const item of incoming) {
    const previous = result.get(item.productId);
    result.set(item.productId, {
      ...item,
      quantity: Math.min(99, item.quantity + (previous?.quantity ?? 0)),
    });
  }
  return [...result.values()].slice(0, 100);
}
