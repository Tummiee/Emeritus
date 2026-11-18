export function checkoutUrlIsTrusted(
  value: string,
  provider: "paystack" | "monnify",
) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (provider === "paystack"
        ? url.hostname === "checkout.paystack.com"
        : url.hostname === "monnify.com" ||
          url.hostname.endsWith(".monnify.com"))
    );
  } catch {
    return false;
  }
}
