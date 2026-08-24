import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { formatDateTime } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { DisputeResolutionModal } from "@/components/admin/DisputeResolutionModal";
import { Card, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";

export const metadata = { title: "Disputes" };

export default async function DisputesAdminPage() {
  const { admin } = await requireAdminContext();

  const { data: jobs, error } = await admin
    .from("jobs")
    .select("id, service_id, customer_id, city, state, total_cents, created_at, updated_at, description")
    .eq("status", "DISPUTED")
    .order("updated_at", { ascending: false });

  const serviceIds = [...new Set((jobs ?? []).map((j) => j.service_id))];
  const customerIds = [...new Set((jobs ?? []).map((j) => j.customer_id))];
  const serviceNameById = new Map<string, string>();
  const customerNameById = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: svcRows } = await admin.from("services").select("id, name").in("id", serviceIds);
    for (const s of svcRows ?? []) serviceNameById.set(s.id, s.name);
  }
  if (customerIds.length > 0) {
    const { data: custRows } = await admin.from("profiles").select("id, full_name").in("id", customerIds);
    for (const c of custRows ?? []) customerNameById.set(c.id, c.full_name);
  }

  return (
    <div>
      <PageHeader title="Disputes" description="Jobs flagged for review. Resolve each with a refund, fund release, or dismissal." />

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load disputes: {error.message}</Card>
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState title="No open disputes" description="Disputed jobs will show up here for resolution." />
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => (
            <Card key={j.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/admin/jobs/${j.id}`} className="font-display text-base font-semibold text-ink hover:text-brand">
                    {serviceNameById.get(j.service_id) ?? "Job"}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">
                    {customerNameById.get(j.customer_id) ?? "Unknown customer"} · {j.city}, {j.state} · {formatCents(j.total_cents)}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">Flagged {formatDateTime(j.updated_at)}</p>
                  {j.description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{j.description}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/admin/jobs/${j.id}`}
                    className="tap-target inline-flex h-9 items-center rounded-full border border-line px-4 text-sm font-medium text-ink hover:bg-ink/5"
                  >
                    View job
                  </Link>
                  <DisputeResolutionModal jobId={j.id} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
