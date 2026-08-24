import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/config";
import { formatCents } from "@/lib/domain/money";
import type { Database, PricingModel } from "@/types/database";

export type CatalogCategory = Database["public"]["Tables"]["service_categories"]["Row"];

export type CatalogService = Database["public"]["Tables"]["services"]["Row"] & {
  service_categories: { name: string; slug: string; icon: string } | null;
};

/**
 * Read-only helpers for the public service catalog. These are used across
 * the marketing site (home, /services, /services/[slug], sitemap) and are
 * always guarded by isSupabaseConfigured so pages render a good empty state
 * instead of throwing when there's no live Supabase project yet.
 */

export async function getActiveServices(): Promise<{
  services: CatalogService[];
  configured: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured) {
    return { services: [], configured: false, error: null };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*, service_categories(name, slug, icon)")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return { services: (data as unknown as CatalogService[]) ?? [], configured: true, error: null };
  } catch (err) {
    return {
      services: [],
      configured: true,
      error: err instanceof Error ? err.message : "Could not load services.",
    };
  }
}

export async function getServiceBySlug(slug: string): Promise<{
  service: CatalogService | null;
  configured: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured) {
    return { service: null, configured: false, error: null };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("services")
      .select("*, service_categories(name, slug, icon)")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    if (error) throw error;
    return { service: (data as unknown as CatalogService) ?? null, configured: true, error: null };
  } catch (err) {
    return {
      service: null,
      configured: true,
      error: err instanceof Error ? err.message : "Could not load this service.",
    };
  }
}

export async function getActiveCategories(): Promise<{
  categories: CatalogCategory[];
  configured: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured) {
    return { categories: [], configured: false, error: null };
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("service_categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return { categories: data ?? [], configured: true, error: null };
  } catch (err) {
    return {
      categories: [],
      configured: true,
      error: err instanceof Error ? err.message : "Could not load categories.",
    };
  }
}

/** Human-readable price summary for a service card or landing page. */
export function formatPriceSummary(service: {
  pricing_model: PricingModel;
  base_price_cents: number;
  min_price_cents: number;
  unit_label: string | null;
}): string {
  const { pricing_model, base_price_cents, min_price_cents, unit_label } = service;

  switch (pricing_model) {
    case "quote":
      return `Custom quote · ${formatCents(min_price_cents, { showCents: false })} minimum`;
    case "flat":
      return `${formatCents(base_price_cents, { showCents: base_price_cents % 100 !== 0 })} flat rate`;
    case "hourly":
      return `${formatCents(base_price_cents, { showCents: base_price_cents % 100 !== 0 })}${unit_label ? ` ${unit_label}` : "/hr"} · ${formatCents(min_price_cents, { showCents: false })} minimum`;
    case "quantity":
      return `${formatCents(base_price_cents, { showCents: base_price_cents % 100 !== 0 })}${unit_label ? ` ${unit_label}` : ""} · ${formatCents(min_price_cents, { showCents: false })} minimum`;
    case "sqft":
      return `${formatCents(base_price_cents, { showCents: true })}${unit_label ? ` ${unit_label}` : ""} · ${formatCents(min_price_cents, { showCents: false })} minimum`;
    default:
      return `Starting at ${formatCents(min_price_cents, { showCents: false })}`;
  }
}

export function pricingModelExplanation(pricing_model: PricingModel): string {
  switch (pricing_model) {
    case "flat":
      return "This service has a flat rate — you'll know the exact price before you book.";
    case "hourly":
      return "This service is billed hourly. Your Guy will confirm the estimated time before starting.";
    case "quantity":
      return "This service is priced per item. You'll see the total based on how many you need.";
    case "sqft":
      return "This service is priced by square footage. Give us your approximate area for an accurate price.";
    case "quote":
      return "This service requires a custom quote. Describe the job (photos help) and your Guy will send a price before any work begins.";
    default:
      return "Pricing is confirmed before any work begins.";
  }
}
