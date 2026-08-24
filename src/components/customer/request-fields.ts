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

export function validateRequiredFields(
  requestFields: RequestField[],
  details: Record<string, unknown>,
): string | null {
  for (const field of requestFields) {
    if (!field.required) continue;
    const value = details[field.key];
    if (field.type === "boolean") continue; // booleans are always "answered"
    if (field.type === "multiselect") {
      if (!Array.isArray(value) || value.length === 0) return `${field.label} is required.`;
      continue;
    }
    if (value === undefined || value === null || String(value).trim() === "") {
      return `${field.label} is required.`;
    }
  }
  return null;
}
