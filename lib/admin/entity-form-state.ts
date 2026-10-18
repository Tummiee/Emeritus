import type { EntityConfig } from "./entities";

export type EntityFormState = {
  message: string;
  fieldErrors: Record<string, string[]>;
  submission: number;
};

export const initialEntityFormState: EntityFormState = {
  message: "",
  fieldErrors: {},
  submission: 0,
};

export function entityDatabaseError(
  error: { code?: string; message: string; details?: string | null },
  config: EntityConfig,
): { message: string; fieldErrors: Record<string, string[]> } {
  // Match database column/constraint names, not the submitted value (a slug
  // such as "name" must not turn a slug conflict into a Name error).
  const detail = error.details?.match(/Key \(([^)]+)\)/i)?.[1] ?? error.message;
  const field = config.fields.find((item) =>
    new RegExp(`(?:\\b|_)${item.name}(?:\\b|_)`, "i").test(detail),
  );
  const label = field?.label ?? "Value";
  let message: string;
  switch (error.code) {
    case "23505":
      message = field
        ? `${label} is already in use. Enter a different ${label.toLowerCase()}.`
        : "A record with these unique details already exists. Check the slug, SKU or code and use a different value.";
      break;
    case "23503":
      message =
        "The selected related record no longer exists. Refresh the page and select it again.";
      break;
    case "23502":
      message = `${label} is required. Enter a value before saving.`;
      break;
    case "23514":
    case "22P02":
      message = field
        ? `${label} has an unsupported value. Check its format and allowed range.`
        : `The database rejected these values: ${error.message}. Check the selected options and numeric ranges.`;
      break;
    case "42501":
      message =
        "Your account cannot save this record. Sign in with an administrator account; if this continues, ask the site administrator to check database permissions.";
      break;
    case "PGRST202":
    case "PGRST204":
    case "42P01":
    case "42703":
    case "42883":
      message =
        "The database is missing a required function, table or column. Ask the site administrator to apply the pending migrations and reload the Supabase API schema.";
      break;
    default:
      message = `Could not save this ${config.singular}: ${error.message}. Check the database connection and try again; if it continues, contact the site administrator${error.code ? ` with error code ${error.code}` : ""}.`;
  }
  return { message, fieldErrors: field ? { [field.name]: [message] } : {} };
}
