import "server-only";
import type { PaymentProcessor } from "./types";
import { DemoPaymentProcessor } from "./demo-processor";
import { StripeConnectProcessor } from "./stripe-processor";

export type { PaymentProcessor } from "./types";
export * from "./types";

let cached: PaymentProcessor | null = null;

/**
 * Returns the active payment processor. Uses real Stripe Connect when
 * STRIPE_SECRET_KEY is configured, otherwise falls back to the demo
 * processor so the marketplace loop is fully exercisable without live
 * payment credentials. Check `.isLive` before telling a user money moved.
 */
export function getPaymentProcessor(): PaymentProcessor {
  if (cached) return cached;

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  cached = stripeKey ? new StripeConnectProcessor(stripeKey) : new DemoPaymentProcessor();
  return cached;
}
