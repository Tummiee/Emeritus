import { z } from "zod";

export const catalogQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
    minPrice: z.coerce.number().finite().min(0).optional(),
    maxPrice: z.coerce.number().finite().min(0).optional(),
    category: z.string().max(100).optional(),
    brand: z.string().max(100).optional(),
    q: z.string().trim().max(120).optional(),
    sortBy: z
      .enum(["newest", "price-asc", "price-desc", "rating", "popular"])
      .default("newest"),
    ids: z.string().max(4000).optional(),
    intent: z.string().max(40).optional(),
  })
  .refine(
    (value) =>
      value.minPrice === undefined ||
      value.maxPrice === undefined ||
      value.minPrice <= value.maxPrice,
    "Invalid price range",
  );
