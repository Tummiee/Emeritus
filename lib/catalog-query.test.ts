import { expect, it } from "vitest";
import { catalogQuerySchema } from "./catalog-query";
it("bounds pagination and validates prices", () => {
  expect(catalogQuerySchema.parse({})).toMatchObject({ page: 1, limit: 12 });
  for (const input of [
    { page: -1 },
    { limit: 1000 },
    { maxPrice: "NaN" },
    { minPrice: 20, maxPrice: 10 },
  ])
    expect(catalogQuerySchema.safeParse(input).success).toBe(false);
});
