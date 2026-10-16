export function pageNumber(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? Math.min(page, 100000) : 1;
}
