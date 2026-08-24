import "server-only";
import Stripe from "stripe";
import type {
  ChargeCustomerInput, ChargeResult, PayoutProviderInput, PayoutResult,
  RefundInput, RefundResult, PaymentProcessor,
} from "./types";
import { SITE_URL } from "@/lib/config";

/**
 * Real Stripe Connect marketplace processor.
 *
 * Model: separate charges + transfers. The platform's Stripe account
 * collects the full customer payment via a hosted Checkout Session, and a
 * separate `Transfer` moves the Guy's earnings to their Connect account
 * once the job is completed. This keeps the platform in full control of
 * timing payouts (e.g. holding funds until job completion / dispute window)
 * rather than using Stripe's automatic destination-charge split.
 *
 * REMAINING SETUP TO GO FULLY LIVE (this code is correct but needs infra):
 *   1. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET in the environment.
 *   2. Point a Stripe webhook at /api/webhooks/stripe for
 *      `checkout.session.completed` (and `charge.refunded` for reconciliation).
 *   3. Onboard each Guy through Stripe Connect Express (create a connected
 *      account + onboarding link) and store the resulting account id in
 *      guy_profiles.stripe_connect_account_id before payouts can run.
 *   4. Enable Stripe Connect on the platform's Stripe account.
 */
export class StripeConnectProcessor implements PaymentProcessor {
  readonly name = "stripe";
  readonly isLive = true;

  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" as Stripe.LatestApiVersion });
  }

  async chargeCustomer(input: ChargeCustomerInput): Promise<ChargeResult> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: input.amountCents,
              product_data: { name: input.description },
            },
            quantity: 1,
          },
        ],
        metadata: { job_id: input.jobId, customer_id: input.customerId },
        success_url: `${SITE_URL}/app/jobs/${input.jobId}?payment=success`,
        cancel_url: `${SITE_URL}/app/jobs/${input.jobId}?payment=cancelled`,
      });

      return {
        success: true,
        processorPaymentIntentId: session.id,
        processorFeeCents: 0, // finalized via webhook/balance transaction once the charge settles
        status: "pending",
        redirectUrl: session.url ?? undefined,
      };
    } catch (err) {
      return {
        success: false,
        processorPaymentIntentId: null,
        processorFeeCents: 0,
        status: "failed",
        failureReason: err instanceof Error ? err.message : "Stripe charge failed",
      };
    }
  }

  async payoutProvider(input: PayoutProviderInput): Promise<PayoutResult> {
    if (!input.connectAccountRef) {
      return { success: false, processorTransferId: null, status: "failed", failureReason: "Guy has no connected Stripe account" };
    }
    try {
      const transfer = await this.stripe.transfers.create({
        amount: input.amountCents,
        currency: "usd",
        destination: input.connectAccountRef,
        metadata: { job_id: input.jobId, guy_id: input.guyId },
      });
      return { success: true, processorTransferId: transfer.id, status: "paid" };
    } catch (err) {
      return {
        success: false,
        processorTransferId: null,
        status: "failed",
        failureReason: err instanceof Error ? err.message : "Stripe transfer failed",
      };
    }
  }

  async refund(input: RefundInput): Promise<RefundResult> {
    if (!input.processorPaymentIntentId) {
      return { success: false, processorRefundId: null, failureReason: "No payment intent to refund" };
    }
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: input.processorPaymentIntentId,
        amount: input.amountCents,
        reason: "requested_by_customer",
      });
      return { success: true, processorRefundId: refund.id };
    } catch (err) {
      return {
        success: false,
        processorRefundId: null,
        failureReason: err instanceof Error ? err.message : "Stripe refund failed",
      };
    }
  }
}
