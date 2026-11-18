export type PaymentIdentity = {
  amount: number | string;
  currency: string;
  user_id?: string;
  order_id?: string;
};
export function paymentMatchesOrder(
  attempt: PaymentIdentity,
  order: {
    id: string;
    user_id: string;
    total: number | string;
    currency: string;
  },
) {
  return (
    attempt.user_id === order.user_id &&
    attempt.order_id === order.id &&
    Number.isFinite(Number(attempt.amount)) &&
    Number(attempt.amount) === Number(order.total) &&
    attempt.currency === order.currency
  );
}
export type SettlementResult = {
  outcome: "settled" | "already_settled" | "needs_reconciliation" | "released";
  orderId: string;
};
