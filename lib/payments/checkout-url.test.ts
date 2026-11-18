import { expect, it } from "vitest";
import { checkoutUrlIsTrusted } from "./checkout-url";
it("rejects forged hosted links while accepting provider checkout origins", () => {
  expect(
    checkoutUrlIsTrusted("https://checkout.paystack.com/session", "paystack"),
  ).toBe(true);
  expect(
    checkoutUrlIsTrusted(
      "https://sandbox.sdk.monnify.com/checkout/session",
      "monnify",
    ),
  ).toBe(true);
  for (const url of [
    "javascript:alert(1)",
    "http://checkout.paystack.com/x",
    "https://checkout.paystack.com.evil.example/x",
    "https://evil.example/x",
  ])
    expect(checkoutUrlIsTrusted(url, "paystack")).toBe(false);
});
