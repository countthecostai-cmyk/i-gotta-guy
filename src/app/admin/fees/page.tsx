import { requireAdminContext } from "../_lib/require-admin";
import { PageHeader } from "@/components/admin/PageHeader";
import { FeeRuleFormModal } from "@/components/admin/FeeRuleFormModal";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";

export const metadata = { title: "Fees" };

export default async function FeesAdminPage() {
  const { admin } = await requireAdminContext();

  const [{ data: rules, error }, { data: services }] = await Promise.all([
    admin.from("platform_fee_rules").select("*").order("service_id", { ascending: true, nullsFirst: true }),
    admin.from("services").select("id, name").order("name"),
  ]);

  const serviceNameById = new Map((services ?? []).map((s) => [s.id, s.name]));
  const serviceOptions = (services ?? []).map((s) => ({ id: s.id, name: s.name }));

  return (
    <div>
      <PageHeader
        title="Platform fees"
        description="The commission I Gotta Guy takes from each job. A global default applies unless a service has its own override."
        action={<FeeRuleFormModal triggerLabel="New fee rule" services={serviceOptions} />}
      />

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load fee rules: {error.message}</Card>
      ) : !rules || rules.length === 0 ? (
        <EmptyState
          title="No fee rules configured"
          description="Without a fee rule, job pricing falls back to a 15% default in code — set an explicit global rule here."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Applies to</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Minimum fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                  <td className="px-4 py-3 font-medium text-ink">
                    {r.service_id ? (serviceNameById.get(r.service_id) ?? "Unknown service") : "Global default"}
                  </td>
                  <td className="px-4 py-3 text-ink-soft capitalize">{r.fee_type}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {r.fee_type === "percent" ? `${r.fee_value}%` : formatCents(Math.round(r.fee_value))}
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatCents(r.min_fee_cents)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.active ? "trust" : "muted"}>{r.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <FeeRuleFormModal
                        triggerLabel="Edit"
                        triggerVariant="outline"
                        services={serviceOptions}
                        initial={{
                          id: r.id,
                          serviceId: r.service_id ?? "",
                          feeType: r.fee_type as "percent" | "flat",
                          feeValue: String(r.fee_value),
                          minFeeDollars: (r.min_fee_cents / 100).toString(),
                          active: r.active,
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
    </div>
  );
}
