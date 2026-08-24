import type { Database, PricingModel } from "@/types/database";

/** A `jobs` row with the joined `services` fields the Guy UI needs. */
export type GuyJobWithService = Database["public"]["Tables"]["jobs"]["Row"] & {
  services: { name: string; pricing_model: PricingModel; unit_label: string | null } | null;
};

/** Full job detail with the full joined `services` row (request_fields, etc). */
export type GuyJobDetail = Database["public"]["Tables"]["jobs"]["Row"] & {
  services: Database["public"]["Tables"]["services"]["Row"] | null;
};

