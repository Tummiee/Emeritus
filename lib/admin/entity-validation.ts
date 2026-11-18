import { z } from "zod";
import { imageUrlAllowed } from "./image-upload";
import type { EntityConfig } from "./entities";
export const integerFields = ["display_order", "usage_limit", "rating"];
export function validateEntityValues(
  config: EntityConfig,
  values: Record<string, unknown>,
  editing: boolean,
  existingSlug?: string,
) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of config.fields) {
    if (editing && field.readOnlyWhenEditing) continue;
    let schema: z.ZodType =
      field.type === "boolean"
        ? z.boolean({ error: "Choose enabled or disabled." })
        : field.type === "number"
          ? z
              .number({ error: "Enter a valid number." })
              .min(0, "Enter zero or a positive number.")
              .max(
                9_999_999_999.99,
                "Enter an amount no greater than 9,999,999,999.99.",
              )
          : field.type === "json"
            ? z.record(z.string(), z.unknown(), {
                error:
                  'Enter a JSON object, for example {"title": "Featured"}. Arrays and plain text are not accepted.',
              })
            : z
                .string({ error: `Enter ${field.label.toLowerCase()}.` })
                .trim()
                .max(
                  field.type === "textarea" ? 10000 : 2048,
                  "Shorten this text to fit the field.",
                );
    if (field.name === "slug")
      schema = z
        .string({ error: "Enter a slug." })
        .trim()
        .refine(
          (value) =>
            (editing && existingSlug !== undefined && value === existingSlug) ||
            /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(value),
          "Use lowercase letters and numbers separated by single hyphens or underscores, for example iphone-18, solar-iron. Do not use spaces.",
        )
        .max(160, "Shorten the slug to 160 characters or fewer.");
    if (integerFields.includes(field.name))
      schema = z
        .number({ error: "Enter a whole number." })
        .int("Enter a whole number without decimal places.")
        .min(
          ["rating", "usage_limit"].includes(field.name) ? 1 : 0,
          field.name === "usage_limit"
            ? "Enter at least 1, or leave blank for unlimited use."
            : field.name === "rating"
              ? "Choose a rating from 1 to 5."
              : "Enter zero or a positive whole number.",
        )
        .max(
          field.name === "rating" ? 5 : 2147483647,
          field.name === "rating"
            ? "Choose a rating from 1 to 5."
            : "Enter a whole number no greater than 2,147,483,647.",
        );
    if (field.type === "select" && field.options)
      schema = z.enum(
        field.options.map((option) => option.value) as [string, ...string[]],
        {
          error: `Choose ${field.options.map((option) => option.label).join(" or ")}.`,
        },
      );
    if (field.type === "select" && field.optionSource)
      schema = z.uuid({
        error:
          "Select a valid record from the list. Refresh the page if the option is no longer available.",
      });
    if (field.type === "image")
      schema = z
        .string({ error: "Upload an image or enter its URL." })
        .refine(
          imageUrlAllowed,
          "Upload an image, use a local path such as /images/photo.jpg, or enter an HTTPS URL from the configured storage or CDN.",
        );
    if (field.type === "datetime")
      schema = z
        .string({ error: "Enter a valid date and time." })
        .refine(
          (value) => Number.isFinite(Date.parse(value)),
          "Enter a valid date and time (Nigeria time).",
        );
    if (!field.required) schema = schema.nullable().optional();
    else if (
      field.type !== "number" &&
      field.type !== "json" &&
      field.type !== "boolean"
    )
      schema = schema.refine(
        (value) => typeof value === "string" && value.length > 0,
        `Enter ${field.label.toLowerCase()}.`,
      );
    shape[field.name] = schema;
  }
  return z
    .object(shape)
    .superRefine((value, ctx) => {
      if (
        config.table === "coupons" &&
        value.discount_type === "percentage" &&
        Number(value.discount_value) > 100
      )
        ctx.addIssue({
          code: "custom",
          path: ["discount_value"],
          message: "Enter a percentage between 0 and 100.",
        });
      if (
        value.starts_at &&
        value.expires_at &&
        Date.parse(String(value.starts_at)) >=
          Date.parse(String(value.expires_at))
      )
        ctx.addIssue({
          code: "custom",
          path: ["expires_at"],
          message:
            "Choose an expiry date and time later than the start date and time.",
        });
    })
    .safeParse(values);
}
