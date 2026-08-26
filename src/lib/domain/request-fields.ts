import type { PricingModel, RequestField } from "@/types/database";

/**
 * Pricing-model-driven services (hourly / quantity / sqft) need a numeric
 * "quantity" to price themselves, but the service schema doesn't (yet) flag
 * which request_field supplies it. This heuristic picks the best numeric
 * field by key name so pricing works for the seeded catalog and for new
 * services added later without a frontend code change in the common case.
 *
 * TODO(schema): add an explicit `isQuantityField?: boolean` to RequestField
 * so this never has to guess.
 */
const QUANTITY_KEY_HINTS: Partial<Record<PricingModel, string[]>> = {
  hourly: ["hour"],
  sqft: ["sqft", "sq_ft", "sq ft", "size", "area"],
  quantity: ["count", "quantity", "qty", "item", "unit"],
};

export function inferQuantity(
  pricingModel: PricingModel,
  requestFields: RequestField[],
  details: Record<string, unknown>,
): number | undefined {
  const numericFields = requestFields.filter((f) => f.type === "number");
  if (numericFields.length === 0) return undefined;

  const hints = QUANTITY_KEY_HINTS[pricingModel] ?? [];
  const matched =
    numericFields.find((f) => hints.some((hint) => f.key.toLowerCase().includes(hint))) ??
    numericFields[0];

  const raw = details[matched.key];
  const num = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export function defaultDetailsValue(field: RequestField): unknown {
  if (field.type === "boolean") return false;
  if (field.type === "multiselect") return [];
  return "";
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === "";
}

export function validateRequiredFields(
  requestFields: RequestField[],
  details: Record<string, unknown>,
  hasPhotos: boolean = false,
): string | null {
  for (const field of requestFields) {
    // requiredUnlessPhotos fields (e.g. "Approximate lawn size") only need
    // an answer when the customer hasn't attached photos instead — see
    // needsPhotoQuoteFallback() below for what happens to pricing in that case.
    const requiredNow = field.required || (field.requiredUnlessPhotos && !hasPhotos);
    if (!requiredNow) continue;
    const value = details[field.key];
    if (field.type === "boolean") continue; // booleans are always "answered"
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.length === 0) return `${field.label} is required.`;
      continue;
    }
    if (isBlank(value)) return `${field.label} is required.`;
    // A required number field with a non-positive value (e.g. "0", "-5")
    // isn't blank, but it's not a usable measurement/quantity either —
    // without this check it silently fell through to
    // calculateServiceAmount()'s `qty ?? 1` default, charging as if the
    // customer had entered 1 unit instead of telling them to fix the field.
    if (field.type === "number") {
      const num = typeof value === "number" ? value : Number(value);
      if (!Number.isFinite(num) || num <= 0) return `${field.label} must be greater than 0.`;
    }
  }
  return null;
}

/**
 * True when the customer left a requiredUnlessPhotos field blank — they're
 * relying on the attached photos instead of a number. Without that number
 * pricing-model quantity (hourly/quantity/sqft) can't compute a real price,
 * so the job must be treated like a quote-priced service: the Guy reviews
 * the photos/description and sends a real quote instead of the customer
 * being charged a placeholder amount up front. Shared between the request
 * form (client-side pricing preview) and createJobRequest (server-side
 * charge decision) so the two can never disagree about which jobs get
 * charged immediately.
 */
export function needsPhotoQuoteFallback(
  requestFields: RequestField[],
  details: Record<string, unknown>,
): boolean {
  return requestFields.some((f) => f.requiredUnlessPhotos && isBlank(details[f.key]));
}
