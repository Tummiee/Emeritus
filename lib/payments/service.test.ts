import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  admin: vi.fn(),
  verify: vi.fn(),
  initialize: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.admin }));
vi.mock("@/lib/auth/url", () => ({
  getSiteUrl: async () => "https://store.example",
}));
vi.mock("./provider", () => ({ paymentProviderIsConfigured: () => true }));
vi.mock("./paystack", async () => {
  class PaystackError extends Error {
    constructor(
      message: string,
      public status = 502,
      public kind = "provider",
    ) {
      super(message);
    }
  }
  return {
    PaystackError,
    verifyPaystackTransaction: mocks.verify,
    initializePaystackTransaction: mocks.initialize,
  };
});
import { confirmPayment, openPayment } from "./service";
import { PaystackError } from "./paystack";
const attempt = {
  reference: "REF",
  order_id: "order",
  user_id: "user",
  amount: 100,
  currency: "NGN",
  provider: "paystack",
  status: "pending",
  authorization_url: "https://checkout.example",
  checkout_url: null,
  initialization_claimed_at: null,
};
const order = {
  id: "order",
  user_id: "user",
  total: 100,
  currency: "NGN",
  status: "pending",
  reservation_released: false,
  shipping_address: { firstName: "Test", lastName: "Buyer" },
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({
    data: { outcome: "settled", orderId: "order" },
    error: null,
  });
  mocks.verify.mockResolvedValue({
    reference: "REF",
    amount: 10000,
    currency: "NGN",
    status: "success",
    raw: { status: "success" },
  });
  mocks.admin.mockReturnValue({
    rpc: mocks.rpc,
    from: (table: string) => {
      const builder = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn(),
        single: vi.fn(),
      };
      builder.select.mockReturnValue(builder);
      builder.eq.mockReturnValue(builder);
      builder.maybeSingle.mockResolvedValue({
        data: { ...attempt },
        error: null,
      });
      builder.single.mockResolvedValue({ data: { ...order }, error: null });
      if (table === "orders")
        builder.maybeSingle.mockResolvedValue({
          data: { ...order },
          error: null,
        });
      return builder;
    },
  });
});
it("does not report settlement success when the database requires reconciliation", async () => {
  mocks.rpc.mockResolvedValue({
    data: { outcome: "needs_reconciliation", orderId: "order" },
    error: null,
  });
  expect(await confirmPayment("REF", "user")).toMatchObject({
    status: "needs_reconciliation",
  });
});
it("keeps queued payments pending", async () => {
  mocks.verify.mockResolvedValue({
    reference: "REF",
    amount: 10000,
    currency: "NGN",
    status: "queued",
    raw: {},
  });
  expect(await confirmPayment("REF", "user")).toMatchObject({
    status: "pending",
  });
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it("does not initialize a new payment during a provider outage", async () => {
  mocks.verify.mockRejectedValue(
    new PaystackError("Provider unavailable", 502, "network"),
  );
  await expect(
    openPayment("REF", "user", "buyer@example.test"),
  ).rejects.toThrow("Provider unavailable");
  expect(mocks.initialize).not.toHaveBeenCalled();
});
it("settles successful existing references instead of charging again", async () => {
  expect(await openPayment("REF", "user", "buyer@example.test")).toMatchObject({
    status: "success",
    orderId: "order",
  });
  expect(mocks.initialize).not.toHaveBeenCalled();
});
