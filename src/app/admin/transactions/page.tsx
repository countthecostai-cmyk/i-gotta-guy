import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { daysAgo, formatDateTime } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card, EmptyState, Badge } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { cn } from "@/lib/utils";
import type { TransactionType, LedgerAccount } from "@/types/database";

export const metadata = { title: "Transactions" };

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

const TYPE_TONE: Record<TransactionType, "default" | "trust" | "brand" | "warn" | "danger" | "muted"> = {
  charge: "brand",
  platform_fee: "trust",
  provider_payout: "trust",
  tip: "brand",
  refund: "danger",
  discount: "muted",
  tax: "muted",
  processor_fee: "warn",
  adjustment: "warn",
  referral_commission: "brand",
};

export default async function TransactionsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { admin } = await requireAdminContext();
  const { range } = await searchParams;
  const selectedRange = RANGE_OPTIONS.some((r) => r.value === range) ? range! : "30";
  const since = daysAgo(Number(selectedRange));

  const [{ data: transactions, error }, { data: jobsInRange }] = await Promise.all([
    admin
      .from("transactions")
      .select("id, job_id, type, account, amount_cents, description, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    admin.from("jobs").select("id, status").gte("created_at", since).limit(5000),
  ]);

  const tx = transactions ?? [];
  const jobStatusById = new Map((jobsInRange ?? []).map((j) => [j.id, j.status]));
  const notRefunded = (jobId: string) => jobStatusById.get(jobId) !== "REFUNDED";

  const grossVolumeCents = tx.filter((t) => t.type === "charge").reduce((s, t) => s + t.amount_cents, 0);
  const platformFeeCents = tx
    .filter((t) => t.type === "platform_fee" && t.account === "platform" && notRefunded(t.job_id))
    .reduce((s, t) => s + t.amount_cents, 0);
  const processorFeeCents = tx
    .filter((t) => t.type === "processor_fee" && t.account === "platform" && notRefunded(t.job_id))
    .reduce((s, t) => s + t.amount_cents, 0);
  const referralCommissionCents = tx
    .filter((t) => t.type === "referral_commission" && t.account === "platform" && notRefunded(t.job_id))
    .reduce((s, t) => s + t.amount_cents, 0);
  const platformRevenueCents = platformFeeCents + referralCommissionCents - processorFeeCents;
  const providerPayoutCents = tx.filter((t) => t.type === "provider_payout").reduce((s, t) => s + t.amount_cents, 0);
  const refundsCents = tx.filter((t) => t.type === "refund").reduce((s, t) => s + t.amount_cents, 0);
  const tipsCents = tx.filter((t) => t.type === "tip").reduce((s, t) => s + t.amount_cents, 0);

  return (
    <div>
      <PageHeader title="Transactions" description="The financial ledger — every dollar traceable back to its job." />

      <div className="mb-5 flex gap-1 rounded-xl bg-ink/5 p-1 w-fit">
        {RANGE_OPTIONS.map((r) => (
          <Link
            key={r.value}
            href={`/admin/transactions?range=${r.value}`}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              selectedRange === r.value ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft hover:text-ink",
            )}
          >
            {r.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Gross transaction volume" value={formatCents(grossVolumeCents)} sublabel="Sum of customer charges" />
        <StatCard
          label="Platform revenue"
          value={formatCents(platformRevenueCents)}
          sublabel="Platform fees + referral commissions − processor fees, non-refunded"
          tone="brand"
        />
        <StatCard label="Provider payouts" value={formatCents(providerPayoutCents)} sublabel="Sum of provider_payout transactions" tone="trust" />
        <StatCard label="Refunds issued" value={formatCents(refundsCents)} />
        <StatCard label="Tips collected" value={formatCents(tipsCents)} />
        <StatCard label="Processor fees" value={formatCents(processorFeeCents)} sublabel="Absorbed by platform" />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Ledger</h2>
        {error ? (
          <Card className="p-6 text-sm text-danger">Failed to load transactions: {error.message}</Card>
        ) : tx.length === 0 ? (
          <EmptyState title="No transactions in this window" description="Try a wider date range." />
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Job</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {tx.map((t) => (
                  <tr key={t.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3">
                      <Badge variant={TYPE_TONE[t.type as TransactionType] ?? "default"}>{t.type.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="px-4 py-3 text-ink-soft capitalize">{t.account as LedgerAccount}</td>
                    <td className="px-4 py-3 font-medium text-ink">{formatCents(t.amount_cents)}</td>
                    <td className="px-4 py-3 text-ink-soft">{t.description || "—"}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/jobs/${t.job_id}`} className="font-medium text-brand hover:underline">
                        View job
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
