import { z } from "zod";
import { imageUrlAllowed } from "./image-upload";
import type { EntityConfig } from "./entities";
export function validateEntityValues(
  config: EntityConfig,
  values: Record<string, unknown>,
  editing: boolean,
) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of config.fields) {
    if (editing && field.readOnlyWhenEditing) continue;
    let schema: z.ZodType =
      field.type === "boolean"
        ? z.boolean()
        : field.type === "number"
          ? z.number().finite().min(0).max(9_999_999_999.99)
          : field.type === "json"
            ? z.record(z.string(), z.unknown())
            : z
                .string()
                .trim()
                .max(field.type === "textarea" ? 10000 : 2048);
    if (field.name === "slug")
      schema = z
        .string()
        .regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/)
        .max(160);
    if (["display_order", "usage_limit", "rating"].includes(field.name))
      schema = z.number().int().min(0).max(2147483647);
    if (field.type === "select" && field.options)
      schema = z.enum(
        field.options.map((option) => option.value) as [string, ...string[]],
      );
    if (field.type === "image")
      schema = z
        .string()
        .url()
        .refine(
          imageUrlAllowed,
          "Use an image from the configured storage or CDN",
        );
    if (field.type === "datetime")
      schema = z
        .string()
        .refine((value) => Number.isFinite(Date.parse(value)), "Invalid date");
    if (!field.required) schema = schema.nullable().optional();
    else if (
      field.type !== "number" &&
      field.type !== "json" &&
      field.type !== "boolean"
    )
      schema = schema.refine(
        (value) => typeof value === "string" && value.length > 0,
        "Required",
      );
    shape[field.name] = schema;
  }
  return z
    .object(shape)
    .refine(
      (value) =>
        config.table !== "coupons" ||
        value.discount_type !== "percentage" ||
        Number(value.discount_value) <= 100,
      "Percentage discounts cannot exceed 100%",
    )
    .refine(
      (value) =>
        !value.starts_at ||
        !value.expires_at ||
        Date.parse(String(value.starts_at)) <
          Date.parse(String(value.expires_at)),
      "End date must follow start date",
    )
    .safeParse(values);
}
