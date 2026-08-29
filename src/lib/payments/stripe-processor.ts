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
 * REMAINING SETUP TO GO FULLY LIVE (code + Stripe-side config are both
 * done — this is the one manual step left, and only Andre can do it):
 *   1. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and
 *      STRIPE_CONNECT_WEBHOOK_SECRET in Vercel's environment variables
 *      (Andre must enter these himself — never pasted through an AI
 *      session). The two webhook endpoints already exist on the Stripe
 *      account, each pointed at /api/webhooks/stripe:
 *        - checkout.session.completed (account endpoint)
 *        - account.updated (Connect endpoint, connect: true)
 *   2. Accept loss liability at
 *      dashboard.stripe.com/settings/connect/platform-profile — Stripe
 *      requires this dashboard step before any connected account can be
 *      created with the platform owning loss liability, which this
 *      marketplace's "separate charges and transfers" model requires.
 *   3. Guys onboard themselves via Stripe Connect Express from
 *      /guy/earnings (see createGuyPayoutOnboardingLink in
 *      src/lib/actions/guys.ts) — no manual account creation needed once
 *      steps 1-2 are done.
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
      // `payments.processor_payment_intent_id` actually stores the Checkout
      // Session id (`cs_...`) returned by chargeCustomer() above — the
      // webhook matches payment rows against it, so that storage can't
      // change without also touching route.ts. Stripe's refunds API takes
      // a real PaymentIntent id (`pi_...`), not a session id, so resolve it
      // here at refund time rather than storing the wrong id everywhere.
      const session = await this.stripe.checkout.sessions.retrieve(input.processorPaymentIntentId);
      const paymentIntentId =
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
      if (!paymentIntentId) {
        return { success: false, processorRefundId: null, failureReason: "No completed payment found for this session yet" };
      }
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId,
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
