import { requireAdminContext } from "../_lib/require-admin";
import { formatDate } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { PromotionFormModal } from "@/components/admin/PromotionFormModal";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";

export const metadata = { title: "Promotions" };

export default async function PromotionsAdminPage() {
  const { admin } = await requireAdminContext();
  const { data: promotions, error } = await admin.from("promotions").select("*").order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader
        title="Promotions"
        description="Discount codes customers can apply at checkout."
        action={<PromotionFormModal triggerLabel="New promotion" />}
      />

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load promotions: {error.message}</Card>
      ) : !promotions || promotions.length === 0 ? (
        <EmptyState title="No promotions yet" description="Create a code to run your first promotion." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map((p) => {
                const expired = p.expires_at ? new Date(p.expires_at) < new Date() : false;
                const exhausted = p.max_uses != null && p.used_count >= p.max_uses;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3">
                      <p className="font-mono font-medium text-ink">{p.code}</p>
                      {p.description && <p className="text-xs text-ink-soft">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {p.discount_type === "percent" ? `${p.discount_value}% off` : `${formatCents(Math.round(p.discount_value))} off`}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {p.used_count} {p.max_uses != null ? `/ ${p.max_uses}` : "(unlimited)"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{p.expires_at ? formatDate(p.expires_at) : "Never"}</td>
                    <td className="px-4 py-3">
                      {!p.active ? (
                        <Badge variant="muted">Inactive</Badge>
                      ) : expired ? (
                        <Badge variant="danger">Expired</Badge>
                      ) : exhausted ? (
                        <Badge variant="warn">Exhausted</Badge>
                      ) : (
                        <Badge variant="trust">Active</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <PromotionFormModal
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          initial={{
                            id: p.id,
                            code: p.code,
                            description: p.description,
                            discountType: p.discount_type as "percent" | "flat",
                            discountValue:
                              p.discount_type === "flat" ? (p.discount_value / 100).toString() : p.discount_value.toString(),
                            maxUses: p.max_uses != null ? String(p.max_uses) : "",
                            active: p.active,
                            expiresAt: p.expires_at ? p.expires_at.slice(0, 10) : "",
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
