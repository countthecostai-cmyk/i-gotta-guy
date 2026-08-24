import { requireAdminContext } from "../_lib/require-admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { CategoryFormModal } from "@/components/admin/CategoryFormModal";
import { ServiceFormModal } from "@/components/admin/ServiceFormModal";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";

export const metadata = { title: "Services" };

const PRICING_LABELS: Record<string, string> = {
  flat: "Flat fee",
  hourly: "Hourly",
  quantity: "Quantity",
  sqft: "Sq. ft",
  quote: "Custom quote",
};

export default async function ServicesAdminPage() {
  const { admin } = await requireAdminContext();

  const [{ data: categories, error: catError }, { data: services, error: svcError }] = await Promise.all([
    admin.from("service_categories").select("*").order("sort_order", { ascending: true }),
    admin.from("services").select("*").order("sort_order", { ascending: true }),
  ]);

  const categoryOptions = (categories ?? []).map((c) => ({ id: c.id, name: c.name }));
  const categoryNameById = new Map((categories ?? []).map((c) => [c.id, c.name]));

  return (
    <div>
      <PageHeader
        title="Services"
        description="The catalog customers browse and request from. Changes here are live immediately."
      />

      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Categories</h2>
          <CategoryFormModal triggerLabel="New category" />
        </div>
        {catError ? (
          <Card className="p-6 text-sm text-danger">Failed to load categories: {catError.message}</Card>
        ) : !categories || categories.length === 0 ? (
          <EmptyState title="No categories yet" description="Create your first category to start building the catalog." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Sort</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3 font-medium text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-ink-soft">{c.slug}</td>
                    <td className="px-4 py-3">
                      <Badge variant={c.active ? "trust" : "muted"}>{c.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{c.sort_order}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <CategoryFormModal
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          initial={{
                            id: c.id,
                            name: c.name,
                            slug: c.slug,
                            description: c.description,
                            icon: c.icon,
                            sortOrder: c.sort_order,
                            active: c.active,
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-ink">Services</h2>
          {categoryOptions.length > 0 && <ServiceFormModal triggerLabel="New service" categories={categoryOptions} />}
        </div>
        {svcError ? (
          <Card className="p-6 text-sm text-danger">Failed to load services: {svcError.message}</Card>
        ) : categoryOptions.length === 0 ? (
          <EmptyState title="Create a category first" description="Services must belong to a category." />
        ) : !services || services.length === 0 ? (
          <EmptyState title="No services yet" description="Add your first bookable service." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Pricing</th>
                  <th className="px-4 py-3">Base / Min</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{s.name}</p>
                      <p className="text-xs text-ink-soft">{s.short_description || s.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{categoryNameById.get(s.category_id) ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-soft">
                      {PRICING_LABELS[s.pricing_model] ?? s.pricing_model}
                      {s.unit_label ? ` (${s.unit_label})` : ""}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {formatCents(s.base_price_cents)} / {formatCents(s.min_price_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={s.active ? "trust" : "muted"}>{s.active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <ServiceFormModal
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          categories={categoryOptions}
                          initial={{
                            id: s.id,
                            categoryId: s.category_id,
                            name: s.name,
                            slug: s.slug,
                            shortDescription: s.short_description,
                            description: s.description,
                            pricingModel: s.pricing_model,
                            basePriceDollars: (s.base_price_cents / 100).toString(),
                            minPriceDollars: (s.min_price_cents / 100).toString(),
                            unitLabel: s.unit_label ?? "",
                            active: s.active,
                            requestFields: s.request_fields ?? [],
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>

      {/* TODO: service_addons CRUD (per-service add-ons like "extra bags" or "same-day rush").
          Table + upsert action are not wired yet — add a dedicated upsertServiceAddon
          server action in src/lib/actions/admin.ts and a small editor here when needed. */}
    </div>
  );
}
