import type {
  ChargeCustomerInput, ChargeResult, PayoutProviderInput, PayoutResult,
  RefundInput, RefundResult, PaymentProcessor,
} from "./types";

/**
 * DEMO payment processor — used automatically whenever STRIPE_SECRET_KEY is
 * not configured. It simulates a successful marketplace charge/payout so the
 * full job lifecycle (request → pay → match → complete → payout) can be
 * exercised end to end, but it moves NO real money.
 *
 * This is surfaced to admins/users via `isLive: false` — the UI shows a
 * "Payments running in demo mode" banner whenever this processor is active.
 * Swap in `StripeConnectProcessor` by setting STRIPE_SECRET_KEY; no other
 * code changes required (see ./index.ts).
 */
export class DemoPaymentProcessor implements PaymentProcessor {
  readonly name = "demo";
  readonly isLive = false;

  async chargeCustomer(input: ChargeCustomerInput): Promise<ChargeResult> {
    return {
      success: true,
      processorPaymentIntentId: `demo_pi_${cryptoRandomId()}`,
      // Simulate a realistic card-processing fee (2.9% + $0.30) so the ledger
      // demonstrates real marketplace accounting even in demo mode.
      processorFeeCents: Math.round(input.amountCents * 0.029) + 30,
      status: "succeeded",
    };
  }

  async payoutProvider(_input: PayoutProviderInput): Promise<PayoutResult> {
    return {
      success: true,
      processorTransferId: `demo_tr_${cryptoRandomId()}`,
      status: "paid",
    };
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    return {
      success: true,
      processorRefundId: `demo_re_${cryptoRandomId()}`,
    };
  }
}

function cryptoRandomId(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
