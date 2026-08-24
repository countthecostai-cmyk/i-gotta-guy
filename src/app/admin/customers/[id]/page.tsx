import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminContext } from "../../_lib/require-admin";
import { formatDate, formatDateTime, initials } from "../../_lib/format";
import { JobStatusBadge } from "@/components/admin/StatusBadges";
import { Card, Badge } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import type { JobStatus } from "@/lib/domain/job-state-machine";

export const metadata = { title: "Customer detail" };

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin } = await requireAdminContext();

  const { data: customer } = await admin
    .from("profiles")
    .select("id, full_name, phone, avatar_url, created_at, role")
    .eq("id", id)
    .maybeSingle();

  if (!customer || customer.role !== "customer") notFound();

  const [jobsRes, addressesRes] = await Promise.all([
    admin
      .from("jobs")
      .select("id, service_id, status, city, state, total_cents, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
    admin.from("addresses").select("id, label, line1, line2, city, state, postal_code, is_default").eq("user_id", id),
  ]);

  const jobs = jobsRes.data ?? [];
  const addresses = addressesRes.data ?? [];

  const serviceIds = [...new Set(jobs.map((j) => j.service_id))];
  const serviceNameById = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: svcRows } = await admin.from("services").select("id, name").in("id", serviceIds);
    for (const s of svcRows ?? []) serviceNameById.set(s.id, s.name);
  }

  const totalSpentCents = jobs.reduce((sum, j) => sum + j.total_cents, 0);
  const completedCount = jobs.filter((j) => ["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"].includes(j.status)).length;

  return (
    <div>
      <Link href="/admin/customers" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} /> Back to Customers
      </Link>

      <div className="mb-6 flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-trust-light text-lg font-semibold text-trust-dark">
          {initials(customer.full_name || "Customer")}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{customer.full_name || "Unnamed customer"}</h1>
          <p className="mt-1 text-sm text-ink-soft">{customer.phone || "No phone on file"} · Joined {formatDate(customer.created_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Total jobs</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink">{jobs.length}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Completed</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink">{completedCount}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Lifetime spend</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink">{formatCents(totalSpentCents)}</p>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-ink">Addresses</h2>
          {addresses.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">No saved addresses.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm">
              {addresses.map((a) => (
                <li key={a.id} className="rounded-xl border border-line p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium text-ink">{a.label}</span>
                    {a.is_default && <Badge variant="brand">Default</Badge>}
                  </div>
                  <p className="text-ink-soft">
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    <br />
                    {a.city}, {a.state} {a.postal_code}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-x-auto p-0 lg:col-span-2">
          <div className="border-b border-line p-5 pb-3">
            <h2 className="font-display text-base font-semibold text-ink">Job history</h2>
          </div>
          {jobs.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">No jobs yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                  <th className="px-5 py-2.5">Service</th>
                  <th className="px-5 py-2.5">Location</th>
                  <th className="px-5 py-2.5">Status</th>
                  <th className="px-5 py-2.5">Total</th>
                  <th className="px-5 py-2.5">Date</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-5 py-2.5">
                      <Link href={`/admin/jobs/${j.id}`} className="font-medium text-ink hover:text-brand">
                        {serviceNameById.get(j.service_id) ?? "Job"}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">
                      {j.city}, {j.state}
                    </td>
                    <td className="px-5 py-2.5">
                      <JobStatusBadge status={j.status as JobStatus} />
                    </td>
                    <td className="px-5 py-2.5 text-ink-soft">{formatCents(j.total_cents)}</td>
                    <td className="px-5 py-2.5 text-ink-soft">{formatDateTime(j.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
