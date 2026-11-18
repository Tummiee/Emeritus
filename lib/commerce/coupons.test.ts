import { describe, expect, it } from "vitest";

import { calculateDiscount } from "./coupons";

describe("calculateDiscount", () => {
  it("calculates percentage and fixed discounts", () => {
    expect(calculateDiscount(20_000, "percentage", 10)).toBe(2_000);
    expect(calculateDiscount(20_000, "fixed", 2_500)).toBe(2_500);
  });

  it("never discounts below zero or above the cart total", () => {
    expect(calculateDiscount(1_000, "fixed", 5_000)).toBe(1_000);
    expect(calculateDiscount(1_000, "percentage", 150)).toBe(1_000);
    expect(calculateDiscount(0, "percentage", 10)).toBe(0);
    expect(calculateDiscount(1_000, "fixed", Number.NaN)).toBe(0);
  });
});
