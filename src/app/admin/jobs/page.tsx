import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { daysAgo, formatDateTime } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { JobStatusBadge } from "@/components/admin/StatusBadges";
import { Card, EmptyState, Select } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";
import { cn } from "@/lib/utils";

export const metadata = { title: "Jobs" };

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default async function JobsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string }>;
}) {
  const { admin } = await requireAdminContext();
  const { status, range } = await searchParams;
  const selectedRange = RANGE_OPTIONS.some((r) => r.value === range) ? range! : "30";

  let query = admin
    .from("jobs")
    .select("id, service_id, customer_id, status, city, state, total_cents, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  if (status) query = query.eq("status", status as JobStatus);
  if (selectedRange !== "all") query = query.gte("created_at", daysAgo(Number(selectedRange)));

  const { data: jobs, error } = await query;

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
      <PageHeader title="Jobs" description="Every job requested on the platform." />

      <form className="mb-5 flex flex-wrap items-end gap-3" action="/admin/jobs" method="get">
        <div className="w-48">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Status</label>
          <Select name="status" defaultValue={status ?? ""}>
            <option value="">All statuses</option>
            {(Object.keys(JOB_STATUS_LABELS) as JobStatus[]).map((s) => (
              <option key={s} value={s}>
                {JOB_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-44">
          <label className="mb-1.5 block text-xs font-medium text-ink-soft">Date range</label>
          <Select name="range" defaultValue={selectedRange}>
            {RANGE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </div>
        <button
          type="submit"
          className="tap-target h-11 rounded-full bg-ink px-5 text-sm font-medium text-paper hover:bg-ink/90"
        >
          Apply
        </button>
      </form>

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load jobs: {error.message}</Card>
      ) : !jobs || jobs.length === 0 ? (
        <EmptyState title="No jobs match these filters" description="Try widening the date range or clearing the status filter." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Requested</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((j) => (
                <tr
                  key={j.id}
                  className={cn(
                    "border-b border-line last:border-0 hover:bg-ink/[0.02]",
                    j.status === "DISPUTED" && "bg-danger-light/30",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link href={`/admin/jobs/${j.id}`} className="font-medium text-ink hover:text-brand">
                      {serviceNameById.get(j.service_id) ?? "Job"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{customerNameById.get(j.customer_id) ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-soft">
                    {j.city}, {j.state}
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={j.status as JobStatus} />
                  </td>
                  <td className="px-4 py-3 text-ink-soft">{formatCents(j.total_cents)}</td>
                  <td className="px-4 py-3 text-ink-soft">{formatDateTime(j.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
