import { z } from "zod";

export const cartLinesSchema = z
  .array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1).max(99),
    }),
  )
  .min(1)
  .max(100)
  .refine(
    (lines) =>
      new Set(lines.map((line) => line.productId)).size === lines.length,
    "Duplicate products",
  );
export const shippingAddressSchema = z.object({
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(7).max(30),
  address: z.string().trim().min(5).max(250),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  zip: z.string().trim().max(20).default(""),
  country: z
    .string()
    .trim()
    .refine(
      (value) => ["nigeria", "ng"].includes(value.toLowerCase()),
      "Nigeria delivery only",
    )
    .default("Nigeria"),
});
export const quoteSchema = z.object({
  items: cartLinesSchema,
  couponCode: z.string().trim().max(50).nullable().optional(),
  state: z.string().trim().min(2).max(80).nullable().optional(),
});
export const checkoutSchema = z.object({
  items: cartLinesSchema,
  shippingAddress: shippingAddressSchema,
  quoteId: z.string().length(32),
  couponCode: z.string().trim().max(50).nullable().optional(),
  idempotencyKey: z.string().uuid(),
});
export type CommerceQuote = {
  lines: Array<{
    productId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    regularPrice: number;
    promotionId: string | null;
  }>;
  subtotal: number;
  discount: number;
  shipping: number | null;
  total: number;
  tax: {
    name: string;
    rate: number;
    amount: number;
    taxableAmount: number;
  } | null;
  quoteId: string;
  couponCode: string | null;
};
