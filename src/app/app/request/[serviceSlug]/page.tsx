import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm, type RebookPrefill } from "@/components/customer/request-form";
import type { PlatformFeeRule } from "@/lib/domain/pricing";
import type { Database } from "@/types/database";

type ServiceWithCategory = Database["public"]["Tables"]["services"]["Row"] & {
  service_categories: { icon: string } | null;
};

export const metadata = { title: "Request a service" };

export default async function RequestServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ serviceSlug: string }>;
  searchParams: Promise<{ rebookFrom?: string }>;
}) {
  const { serviceSlug } = await params;
  const { rebookFrom } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/app/request/${serviceSlug}`);

  const { data: serviceRaw, error: serviceErr } = await supabase
    .from("services")
    .select("*, service_categories(icon)")
    .eq("slug", serviceSlug)
    .eq("active", true)
    .maybeSingle();
  if (serviceErr) throw new Error(`Could not load this service: ${serviceErr.message}`);

  const service = serviceRaw as unknown as ServiceWithCategory | null;
  if (!service) notFound();

  const categoryIcon = service.service_categories?.icon ?? "";

  const [{ data: addons, error: addonsErr }, { data: addresses, error: addressesErr }, { data: feeRules, error: feeRulesErr }] = await Promise.all([
    supabase
      .from("service_addons")
      .select("id, name, price_cents")
      .eq("service_id", service.id)
      .eq("active", true)
      .order("sort_order"),
    supabase.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }).order("created_at", { ascending: false }),
    supabase
      .from("platform_fee_rules")
      .select("fee_type, fee_value, min_fee_cents, service_id")
      .eq("active", true)
      .or(`service_id.eq.${service.id},service_id.is.null`)
      .order("service_id", { ascending: false, nullsFirst: false })
      .limit(1),
  ]);
  if (addonsErr || addressesErr || feeRulesErr) throw new Error("Could not load the request form. Please try again.");

  const feeRuleRow = feeRules?.[0];
  const feeRule: PlatformFeeRule = feeRuleRow
    ? { fee_type: feeRuleRow.fee_type as "percent" | "flat", fee_value: feeRuleRow.fee_value, min_fee_cents: feeRuleRow.min_fee_cents }
    : { fee_type: "percent", fee_value: 15, min_fee_cents: 300 };

  let prefill: RebookPrefill | null = null;
  if (rebookFrom) {
    const { data: pastJob } = await supabase
      .from("jobs")
      .select("address_id, details, addon_ids, description, service_id")
      .eq("id", rebookFrom)
      .eq("customer_id", user.id)
      .maybeSingle();
    if (pastJob && pastJob.service_id === service.id) {
      prefill = {
        addressId: pastJob.address_id,
        details: pastJob.details,
        addonIds: pastJob.addon_ids,
        description: pastJob.description,
      };
    }
  }

  return (
    <RequestForm
      service={{
        id: service.id,
        name: service.name,
        slug: service.slug,
        short_description: service.short_description,
        pricing_model: service.pricing_model,
        base_price_cents: service.base_price_cents,
        min_price_cents: service.min_price_cents,
        unit_label: service.unit_label,
        request_fields: service.request_fields,
        category_icon: categoryIcon,
      }}
      addons={addons ?? []}
      addresses={addresses ?? []}
      feeRule={feeRule}
      prefill={prefill}
    />
  );
}
