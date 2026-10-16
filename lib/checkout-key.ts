const key = "emeritus-checkout-idempotency";
let fallback: string | undefined;
export function checkoutKey() {
  try {
    const saved = sessionStorage.getItem(key);
    if (saved) return saved;
  } catch {}
  fallback ??= crypto.randomUUID();
  try {
    sessionStorage.setItem(key, fallback);
  } catch {}
  return fallback;
}
export function resetCheckoutKey() {
  fallback = crypto.randomUUID();
  try {
    sessionStorage.setItem(key, fallback);
  } catch {}
  return fallback;
}
export function clearCheckoutKey() {
  fallback = undefined;
  try {
    sessionStorage.removeItem(key);
  } catch {}
}
