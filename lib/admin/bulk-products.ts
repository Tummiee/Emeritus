export const DELETE_ALL_PRODUCTS_CONFIRMATION = "DELETE ALL PRODUCTS"

export function isDeleteAllProductsConfirmed(value: FormDataEntryValue | null) {
  return String(value ?? "").trim() === DELETE_ALL_PRODUCTS_CONFIRMATION
}
