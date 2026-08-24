import Link from "next/link";
import { requireAdminContext } from "./_lib/require-admin";
import { daysAgo, formatDateTime } from "./_lib/format";
import { StatCard } from "@/components/admin/StatCard";
import { JobStatusBadge } from "@/components/admin/StatusBadges";
import { Card, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import type { JobStatus } from "@/lib/domain/job-state-machine";

export const metadata = { title: "Overview" };

const WINDOW_DAYS = 90;

export default async function AdminOverviewPage() {
  const { admin } = await requireAdminContext();
  const since = daysAgo(WINDOW_DAYS);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [jobsRes, transactionsRes, payoutsRes, reviewsRes, guysRes, servicesRes] = await Promise.all([
    admin
      .from("jobs")
      .select("id, status, customer_id, guy_id, service_id, total_cents, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
    admin
      .from("transactions")
      .select("job_id, type, account, amount_cents, created_at")
      .gte("created_at", since)
      .limit(10000),
    admin.from("provider_payouts").select("amount_cents, status, created_at").gte("created_at", since).limit(5000),
    admin.from("reviews").select("rating, created_at").gte("created_at", since).limit(5000),
    admin.from("guy_profiles").select("id, status", { count: "exact" }),
    admin.from("services").select("id, name"),
  ]);

  const jobs = jobsRes.data ?? [];
  const transactions = transactionsRes.data ?? [];
  const payouts = payoutsRes.data ?? [];
  const reviews = reviewsRes.data ?? [];
  const guys = guysRes.data ?? [];
  const serviceNameById = new Map((servicesRes.data ?? []).map((s) => [s.id, s.name]));

  // Job status is the source of truth for a job's lifecycle; a job that has
  // moved to REFUNDED means its platform fee for that job should not count
  // toward realized platform revenue below.
  const jobStatusById = new Map(jobs.map((j) => [j.id, j.status as JobStatus]));

  const chargeTx = transactions.filter((t) => t.type === "charge");
  const grossVolumeCents = chargeTx.reduce((sum, t) => sum + t.amount_cents, 0);

  // Platform revenue = platform_fee collected − processor fees absorbed by
  // the platform, excluding any job that has since been refunded (its fee
  // was reversed with the charge). See README note in this file's header.
  const platformFeeTx = transactions.filter((t) => t.type === "platform_fee" && t.account === "platform");
  const processorFeeTx = transactions.filter((t) => t.type === "processor_fee" && t.account === "platform");
  const notRefunded = (jobId: string) => jobStatusById.get(jobId) !== "REFUNDED";
  const platformRevenueCents =
    platformFeeTx.filter((t) => notRefunded(t.job_id)).reduce((s, t) => s + t.amount_cents, 0) -
    processorFeeTx.filter((t) => notRefunded(t.job_id)).reduce((s, t) => s + t.amount_cents, 0);

  const refundTx = transactions.filter((t) => t.type === "refund");
  const refundsCents = refundTx.reduce((s, t) => s + t.amount_cents, 0);

  const paidPayoutsCents = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);
  const pendingPayoutsCents = payouts
    .filter((p) => p.status === "pending" || p.status === "in_transit")
    .reduce((s, p) => s + p.amount_cents, 0);

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter((j) => j.status === "COMPLETED" || j.status === "PAYOUT_PENDING" || j.status === "PAYOUT_COMPLETED").length;
  const cancelledJobs = jobs.filter((j) => j.status === "CANCELLED" || j.status === "DECLINED").length;
  const jobsToday = jobs.filter((j) => new Date(j.created_at) >= todayStart).length;

  const ordersCount = chargeTx.length;
  const avgOrderValueCents = ordersCount > 0 ? Math.round(grossVolumeCents / ordersCount) : 0;

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;

  const customerJobCounts = new Map<string, number>();
  for (const j of jobs) customerJobCounts.set(j.customer_id, (customerJobCounts.get(j.customer_id) ?? 0) + 1);
  const activeCustomers = customerJobCounts.size;
  const repeatCustomers = [...customerJobCounts.values()].filter((c) => c > 1).length;

  const activeGuys = guys.filter((g) => g.status === "approved").length;

  const serviceCounts = new Map<string, number>();
  for (const j of jobs) serviceCounts.set(j.service_id, (serviceCounts.get(j.service_id) ?? 0) + 1);
  const topServices = [...serviceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([serviceId, count]) => ({ name: serviceNameById.get(serviceId) ?? "Unknown service", count }));

  const recentJobs = jobs.slice(0, 8);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink">Overview</h1>
        <p className="mt-1 text-sm text-ink-soft">Marketplace metrics for the last {WINDOW_DAYS} days.</p>
      </div>

      {totalJobs === 0 && transactions.length === 0 ? (
        <EmptyState
          title="No activity yet"
          description="Once customers start requesting jobs, marketplace metrics will show up here."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Gross transaction volume" value={formatCents(grossVolumeCents)} sublabel="Total customer charges" />
            <StatCard
              label="Platform revenue"
              value={formatCents(platformRevenueCents)}
              sublabel="Platform fees − processor fees, non-refunded jobs"
              tone="brand"
            />
            <StatCard
              label="Provider payouts"
              value={formatCents(paidPayoutsCents)}
              sublabel={`${formatCents(pendingPayoutsCents)} pending/in transit`}
              tone="trust"
            />
            <StatCard label="Total jobs" value={totalJobs.toLocaleString()} sublabel={`${jobsToday} today`} />
            <StatCard label="Completed jobs" value={completedJobs.toLocaleString()} tone="trust" />
            <StatCard label="Cancelled / declined" value={cancelledJobs.toLocaleString()} />
            <StatCard label="Average order value" value={formatCents(avgOrderValueCents)} sublabel={`${ordersCount} paid orders`} />
            <StatCard label="Average rating" value={avgRating !== null ? avgRating.toFixed(2) : "—"} sublabel={`${reviews.length} reviews`} />
            <StatCard label="Refunds" value={formatCents(refundsCents)} sublabel={`${refundTx.length} refunds issued`} />
            <StatCard label="Active customers" value={activeCustomers.toLocaleString()} sublabel="Placed a job this period" />
            <StatCard label="Active Guys" value={activeGuys.toLocaleString()} sublabel="Approved & live" />
            <StatCard label="Repeat customers" value={repeatCustomers.toLocaleString()} sublabel="2+ jobs this period" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-5">
              <h2 className="font-display text-base font-semibold text-ink">Most-requested services</h2>
              {topServices.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">No job requests in this period yet.</p>
              ) : (
                <ul className="mt-4 space-y-2.5">
                  {topServices.map((s) => (
                    <li key={s.name} className="flex items-center justify-between text-sm">
                      <span className="text-ink">{s.name}</span>
                      <span className="font-medium text-ink-soft">{s.count} jobs</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-5">
              <h2 className="font-display text-base font-semibold text-ink">Recent activity</h2>
              {recentJobs.length === 0 ? (
                <p className="mt-3 text-sm text-ink-soft">No recent jobs.</p>
              ) : (
                <ul className="mt-4 divide-y divide-line">
                  {recentJobs.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="min-w-0">
                        <Link href={`/admin/jobs/${j.id}`} className="font-medium text-ink hover:text-brand">
                          {serviceNameById.get(j.service_id) ?? "Job"}
                        </Link>
                        <p className="text-xs text-ink-soft">{formatDateTime(j.created_at)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-ink-soft">{formatCents(j.total_cents)}</span>
                        <JobStatusBadge status={j.status as JobStatus} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/admin/jobs" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">
                View all jobs →
              </Link>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
