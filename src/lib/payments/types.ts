/**
 * Marketplace payment boundary.
 *
 * This interface is the ONLY way the rest of the app touches a payment
 * processor. Swapping processors (or going from demo mode to live Stripe
 * Connect) never requires touching business logic elsewhere — only the
 * implementation registered in `./index.ts`.
 */

export interface ChargeCustomerInput {
  jobId: string;
  customerId: string;
  amountCents: number;
  /** Stripe (or equivalent) customer/payment-method reference, once real billing exists. */
  customerPaymentMethodRef?: string | null;
  description: string;
}

export interface ChargeResult {
  success: boolean;
  processorPaymentIntentId: string | null;
  processorFeeCents: number;
  status: "succeeded" | "pending" | "failed";
  failureReason?: string;
  /**
   * Present when the processor requires an external hosted flow (e.g. a
   * Stripe Checkout Session) before the charge can succeed. The caller
   * must redirect the customer here; the job stays in REQUESTED until a
   * webhook confirms payment and advances it to MATCHING.
   */
  redirectUrl?: string;
}

export interface PayoutProviderInput {
  guyId: string;
  jobId: string;
  amountCents: number;
  /** Stripe Connect account id (or equivalent), once real Connect onboarding exists. */
  connectAccountRef?: string | null;
}

export interface PayoutResult {
  success: boolean;
  processorTransferId: string | null;
  status: "paid" | "in_transit" | "failed";
  failureReason?: string;
}

export interface RefundInput {
  jobId: string;
  processorPaymentIntentId: string | null;
  amountCents: number;
  reason: string;
}

export interface RefundResult {
  success: boolean;
  processorRefundId: string | null;
  failureReason?: string;
}

export interface PaymentProcessor {
  readonly name: string;
  /** Whether this processor is fully configured to move real money. */
  readonly isLive: boolean;
  chargeCustomer(input: ChargeCustomerInput): Promise<ChargeResult>;
  payoutProvider(input: PayoutProviderInput): Promise<PayoutResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
