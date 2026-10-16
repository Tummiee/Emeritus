import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { paymentMatchesOrder, type SettlementResult } from "./integrity";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
  PaystackError,
} from "./paystack";
import {
  initializeMonnifyTransaction,
  verifyMonnifyTransaction,
} from "./monnify";
import { paystackAmountsMatch } from "./paystack-utils";
import { classifyPaystackTransactionStatus } from "./paystack-lifecycle";
import { amountsMatch } from "./monnify";
import { paymentProviderIsConfigured, type PaymentProvider } from "./provider";
import { HttpError } from "@/lib/http";
import { getSiteUrl } from "@/lib/auth/url";
import { checkoutUrlIsTrusted } from "./checkout-url";

export type Attempt = {
  reference: string;
  order_id: string;
  user_id: string;
  amount: number | string;
  currency: string;
  provider: PaymentProvider;
  status: string;
  authorization_url: string | null;
  checkout_url: string | null;
  provider_transaction_reference: string | null;
  expires_at: string;
  initialization_claimed_at: string | null;
};
export async function loadPayment(reference: string, userId?: string) {
  const admin = createAdminClient();
  let query = admin
    .from("payment_attempts")
    .select("*")
    .eq("reference", reference);
  if (userId) query = query.eq("user_id", userId);
  const { data: attempt, error } = await query.maybeSingle();
  if (error) throw error;
  if (!attempt) throw new HttpError("Payment not found", 404);
  const { data: order, error: orderError } = await admin
    .from("orders")
    .select("*")
    .eq("id", attempt.order_id)
    .single();
  if (orderError) throw orderError;
  if (!paymentMatchesOrder(attempt, order))
    throw new HttpError("Payment details require support review", 422);
  return { attempt: attempt as Attempt, order };
}
export async function settle(
  reference: string,
  success: boolean,
  raw: unknown,
): Promise<SettlementResult> {
  const { data, error } = await createAdminClient().rpc("settle_payment_v2", {
    p_reference: reference,
    p_success: success,
    p_provider_response: raw,
  });
  if (error) throw error;
  if (!data?.outcome) throw new Error("Settlement result missing");
  return data as SettlementResult;
}
export async function inspectPayment(attempt: Attempt) {
  if (attempt.provider === "paystack") {
    const transaction = await verifyPaystackTransaction(attempt.reference);
    if (
      transaction.reference !== attempt.reference ||
      transaction.currency !== attempt.currency ||
      !paystackAmountsMatch(transaction.amount, Number(attempt.amount))
    )
      throw new HttpError("Payment details did not pass verification", 422);
    return {
      state: classifyPaystackTransactionStatus(transaction.status),
      raw: transaction.raw,
      safeToExpire: transaction.status === "pending",
    };
  }
  const transaction = await verifyMonnifyTransaction(attempt.reference);
  if (
    transaction.paymentReference !== attempt.reference ||
    (attempt.provider_transaction_reference &&
      transaction.transactionReference !==
        attempt.provider_transaction_reference) ||
    transaction.currency !== attempt.currency
  )
    throw new HttpError("Payment details did not pass verification", 422);
  if (
    transaction.paymentStatus === "PAID" &&
    !amountsMatch(transaction.amountPaid, Number(attempt.amount))
  )
    throw new HttpError("Payment amount did not pass verification", 422);
  return {
    state:
      transaction.paymentStatus === "PAID"
        ? "successful"
        : ["FAILED", "EXPIRED", "CANCELLED", "REVERSED"].includes(
              transaction.paymentStatus,
            )
          ? "terminal"
          : "active",
    raw: transaction.raw,
    safeToExpire: transaction.paymentStatus === "PENDING",
  };
}
export async function confirmPayment(reference: string, userId?: string) {
  const { attempt, order } = await loadPayment(reference, userId);
  if (
    attempt.status === "successful" &&
    (!["confirmed", "processing", "shipped", "delivered"].includes(
      order.status,
    ) ||
      order.reservation_released)
  ) {
    const result = await settle(reference, true, {
      reason: "historical_settlement_check",
    });
    return {
      status: "needs_reconciliation",
      orderId: result.orderId,
      outcome: result.outcome,
    };
  }
  if (attempt.status === "successful")
    return {
      status: "success",
      orderId: attempt.order_id,
      outcome: "already_settled",
    };
  const inspected = await inspectPayment(attempt);
  if (inspected.state === "successful") {
    const result = await settle(reference, true, inspected.raw);
    return {
      status:
        result.outcome === "needs_reconciliation"
          ? "needs_reconciliation"
          : "success",
      orderId: result.orderId,
      outcome: result.outcome,
    };
  }
  if (inspected.state === "terminal") {
    await settle(reference, false, inspected.raw);
    return { status: "failed", orderId: attempt.order_id };
  }
  return { status: "pending", orderId: attempt.order_id };
}
export async function openPayment(
  reference: string,
  userId: string,
  email: string,
  recoveryDepth = 0,
): Promise<{
  status: string;
  orderId: string;
  checkoutUrl?: string;
  paymentReference?: string;
  provider?: PaymentProvider;
}> {
  const { attempt, order } = await loadPayment(reference, userId);
  if (attempt.status === "successful") {
    const confirmed = await confirmPayment(reference, userId);
    return { status: confirmed.status, orderId: order.id };
  }
  if (
    order.status !== "pending" ||
    order.reservation_released ||
    attempt.status !== "pending"
  )
    throw new HttpError("This checkout is no longer payable", 409);
  let inspected: Awaited<ReturnType<typeof inspectPayment>> | null = null;
  let referenceMissing = false;
  try {
    inspected = await inspectPayment(attempt);
  } catch (error) {
    referenceMissing =
      error instanceof PaystackError && error.kind === "reference_not_found";
    if (
      !(
        error instanceof PaystackError && error.kind === "reference_not_found"
      ) &&
      (attempt.authorization_url || attempt.checkout_url)
    )
      throw error;
    // No saved URL can mean an interrupted initialization. A transient error is not permission to mint another reference.
    if (
      !(
        error instanceof PaystackError && error.kind === "reference_not_found"
      ) &&
      attempt.initialization_claimed_at
    )
      throw error;
  }
  if (inspected?.state === "successful") {
    const result = await settle(reference, true, inspected.raw);
    return {
      status:
        result.outcome === "needs_reconciliation"
          ? "needs_reconciliation"
          : "success",
      orderId: result.orderId,
    };
  }
  if (inspected?.state === "terminal") {
    await settle(reference, false, inspected.raw);
    throw new HttpError(
      "The previous payment finished. Start a new checkout.",
      409,
    );
  }
  const savedUrl = attempt.authorization_url || attempt.checkout_url;
  if (
    (referenceMissing && savedUrl) ||
    (!savedUrl &&
      inspected?.state === "active" &&
      attempt.initialization_claimed_at &&
      Date.parse(attempt.initialization_claimed_at) < Date.now() - 120000)
  ) {
    if (recoveryDepth > 0)
      throw new HttpError(
        "Checkout recovery is in progress. Retry shortly.",
        409,
      );
    const { data, error } = await createAdminClient().rpc(
      "replace_order_payment_retry",
      {
        p_order_id: order.id,
        p_user_id: userId,
        p_previous_reference: reference,
        p_new_reference: "EG-" + crypto.randomUUID(),
        p_idempotency_key: crypto.randomUUID(),
        p_provider_response: {
          reason: "interrupted_initialization",
          previousReference: reference,
        },
      },
    );
    if (error) throw error;
    return openPayment(data.reference, userId, email, recoveryDepth + 1);
  }
  if (savedUrl && !checkoutUrlIsTrusted(savedUrl, attempt.provider))
    throw new HttpError("Saved checkout link requires support review", 422);
  if (savedUrl)
    return {
      status: "pending",
      checkoutUrl: savedUrl,
      orderId: order.id,
      paymentReference: reference,
      provider: attempt.provider,
    };
  if (!paymentProviderIsConfigured(attempt.provider))
    throw new HttpError("Payment service unavailable", 503);
  const admin = createAdminClient();
  const { data: claimed, error: claimError } = await admin.rpc(
    "claim_payment_initialization",
    { p_reference: reference },
  );
  if (claimError) throw claimError;
  if (!claimed)
    throw new HttpError(
      "Payment initialization is in progress. Retry shortly.",
      409,
    );
  const callbackUrl = (await getSiteUrl()) + "/payment/callback";
  const initialized =
    attempt.provider === "paystack"
      ? await initializePaystackTransaction({
          email,
          amount: Number(order.total),
          currency: order.currency,
          reference,
          callbackUrl,
          metadata: { orderId: order.id, userId },
        })
      : await initializeMonnifyTransaction({
          amount: Number(order.total),
          currencyCode: order.currency,
          paymentReference: reference,
          customerEmail: email,
          customerName: [
            order.shipping_address.firstName,
            order.shipping_address.lastName,
          ].join(" "),
          paymentDescription: `Order ${order.order_number}`,
          redirectUrl: callbackUrl,
          metadata: { orderId: order.id, userId },
        });
  if (!checkoutUrlIsTrusted(initialized.checkoutUrl, attempt.provider))
    throw new HttpError("Provider returned an unexpected checkout link", 502);
  const values =
    attempt.provider === "paystack"
      ? {
          authorization_url: initialized.checkoutUrl,
          access_code:
            "accessCode" in initialized ? initialized.accessCode : null,
        }
      : {
          checkout_url: initialized.checkoutUrl,
          provider_transaction_reference:
            "transactionReference" in initialized
              ? initialized.transactionReference
              : null,
        };
  const { error: saveError } = await admin
    .from("payment_attempts")
    .update({ ...values, provider_response: initialized.raw })
    .eq("reference", reference);
  if (saveError) throw saveError;
  return {
    status: "pending",
    checkoutUrl: initialized.checkoutUrl,
    orderId: order.id,
    paymentReference: reference,
    provider: attempt.provider,
  };
}

export async function reconcilePayment(reference: string) {
  const { attempt } = await loadPayment(reference);
  try {
    const inspected = await inspectPayment(attempt);
    if (inspected.state === "successful")
      return settle(reference, true, inspected.raw);
    if (
      inspected.state === "terminal" ||
      (inspected.safeToExpire && Date.parse(attempt.expires_at) < Date.now())
    )
      return settle(reference, false, inspected.raw);
    return { outcome: "pending", orderId: attempt.order_id };
  } catch (error) {
    if (error instanceof PaystackError && error.kind === "reference_not_found")
      return settle(reference, false, {
        reason: "expired_reference_not_found",
      });
    throw error;
  }
}
