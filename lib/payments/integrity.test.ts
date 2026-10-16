import { expect, it } from "vitest";
import { paymentMatchesOrder } from "./integrity";
it("rejects mismatched ownership, currency and underpayments", () => {
  const order = { id: "o", user_id: "u", total: 10000, currency: "NGN" };
  const attempt = {
    order_id: "o",
    user_id: "u",
    amount: "10000.00",
    currency: "NGN",
  };
  expect(paymentMatchesOrder(attempt, order)).toBe(true);
  for (const change of [
    { amount: 1 },
    { user_id: "other" },
    { order_id: "other" },
    { currency: "USD" },
    { amount: NaN },
  ]) {
    expect(paymentMatchesOrder({ ...attempt, ...change }, order)).toBe(false);
  }
});
