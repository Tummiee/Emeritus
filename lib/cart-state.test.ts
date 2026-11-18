import { expect, it } from "vitest";
import { parseCart, mergeCart } from "./cart-state";
const item = {
  productId: "00000000-0000-4000-8000-000000000001",
  name: "Phone",
  image: "/image.webp",
  price: 100,
  quantity: 1,
};
it("ignores corrupted storage and invalid quantities", () => {
  expect(parseCart("invalid")).toEqual([]);
  expect(
    parseCart(
      JSON.stringify([
        { ...item, quantity: 0 },
        { ...item, price: "100" },
        { ...item, quantity: 1.5 },
        item,
      ]),
    ),
  ).toEqual([item]);
});
it("bounds merged quantities", () => {
  expect(
    mergeCart([{ ...item, quantity: 98 }], [{ ...item, quantity: 4 }])[0]
      .quantity,
  ).toBe(99);
});
