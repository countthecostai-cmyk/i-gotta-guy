import { clampMin, percentOfCents, sumCents } from "./money";

/**
 * Centralized pricing engine. Every price shown to a customer or used to
 * charge a payment method must flow through `calculatePricing` — never
 * recompute totals inline in a component or API route.
 */

export type PricingModel = "flat" | "hourly" | "quantity" | "sqft" | "quote";

export interface ServiceForPricing {
  pricing_model: PricingModel;
  base_price_cents: number;
  min_price_cents: number;
}

export interface AddonForPricing {
  id: string;
  price_cents: number;
}

export interface PlatformFeeRule {
  fee_type: "percent" | "flat";
  fee_value: number; // percent (e.g. 15) or flat cents
  min_fee_cents: number;
}

export interface PromotionForPricing {
  discount_type: "percent" | "flat";
  discount_value: number;
}

export interface PricingInput {
  service: ServiceForPricing;
  /** Guy-specific override of the base price, if any. */
  customBasePriceCents?: number | null;
  /**
   * Quantity meaning depends on pricing_model:
   * - hourly: number of hours
   * - quantity: number of units/items
   * - sqft: square feet (billed per 1,000 sq ft using base_price_cents as the per-unit rate)
   * - flat / quote: ignored
   */
  quantity?: number;
  selectedAddons?: AddonForPricing[];
  feeRule: PlatformFeeRule;
  promotion?: PromotionForPricing | null;
  /** Custom-quote amount from a Guy, required when pricing_model === 'quote'. */
  quotedAmountCents?: number | null;
  taxCents?: number; // computed elsewhere (jurisdiction-specific); 0 by default in MVP
  tipCents?: number;
}

export interface PricingBreakdown {
  serviceAmountCents: number;
  addonAmountCents: number;
  discountCents: number;
  taxCents: number;
  platformFeeCents: number;
  tipCents: number;
  /** service + addons + tax + platformFee - discount (tip added separately post-completion) */
  totalCents: number;
  isEstimate: boolean; // true when pricing_model === 'quote' and no quote has been given yet
}

export function calculateServiceAmount(input: PricingInput): number {
  const base = input.customBasePriceCents ?? input.service.base_price_cents;
  const qty = input.quantity ?? 1;

  switch (input.service.pricing_model) {
    case "flat":
      return clampMin(base, input.service.min_price_cents);
    case "hourly":
      return clampMin(Math.round(base * qty), input.service.min_price_cents);
    case "quantity":
      return clampMin(Math.round(base * qty), input.service.min_price_cents);
    case "sqft": {
      // base_price_cents is priced per 1,000 sq ft
      const amount = Math.round((base * qty) / 1000);
      return clampMin(amount, input.service.min_price_cents);
    }
    case "quote":
      return clampMin(input.quotedAmountCents ?? 0, input.service.min_price_cents);
    default:
      return input.service.min_price_cents;
  }
}

export function calculateAddonsAmount(addons: AddonForPricing[] = []): number {
  return sumCents(...addons.map((a) => a.price_cents));
}

export function calculateDiscount(
  subtotalCents: number,
  promotion?: PromotionForPricing | null,
): number {
  if (!promotion) return 0;
  if (promotion.discount_type === "percent") {
    return Math.min(subtotalCents, percentOfCents(subtotalCents, promotion.discount_value));
  }
  return Math.min(subtotalCents, Math.round(promotion.discount_value));
}

export function calculatePlatformFee(
  subtotalCents: number,
  rule: PlatformFeeRule,
): number {
  const raw =
    rule.fee_type === "percent"
      ? percentOfCents(subtotalCents, rule.fee_value)
      : Math.round(rule.fee_value);
  return clampMin(raw, rule.min_fee_cents);
}

/**
 * Computes the full price breakdown for a job. This is the single source of
 * truth used both for the customer-facing pricing preview and for the
 * amount actually charged/stored on the job at request or acceptance time.
 */
export function calculatePricing(input: PricingInput): PricingBreakdown {
  const isEstimate = input.service.pricing_model === "quote" && !input.quotedAmountCents;

  const serviceAmountCents = calculateServiceAmount(input);
  const addonAmountCents = calculateAddonsAmount(input.selectedAddons);
  const subtotal = sumCents(serviceAmountCents, addonAmountCents);
  const discountCents = calculateDiscount(subtotal, input.promotion);
  const taxableAmount = Math.max(0, subtotal - discountCents);
  const taxCents = input.taxCents ?? 0;
  const platformFeeCents = calculatePlatformFee(taxableAmount, input.feeRule);
  const tipCents = input.tipCents ?? 0;

  const totalCents = sumCents(
    serviceAmountCents,
    addonAmountCents,
    -discountCents,
    taxCents,
    platformFeeCents,
    tipCents,
  );

  return {
    serviceAmountCents,
    addonAmountCents,
    discountCents,
    taxCents,
    platformFeeCents,
    tipCents,
    totalCents: Math.max(0, totalCents),
    isEstimate,
  };
}

/**
 * What the Guy actually earns for a job: service + addons - platform fee
 * (the platform never takes a cut of the tip).
 */
export function calculateProviderPayout(breakdown: PricingBreakdown): number {
  return sumCents(
    breakdown.serviceAmountCents,
    breakdown.addonAmountCents,
    -breakdown.discountCents,
    breakdown.tipCents,
  );
}

/** Platform's actual take: the fee it charged, minus anything refunded. */
export function calculatePlatformRevenue(
  platformFeeCents: number,
  refundedPlatformFeeCents: number = 0,
): number {
  return Math.max(0, platformFeeCents - refundedPlatformFeeCents);
}
