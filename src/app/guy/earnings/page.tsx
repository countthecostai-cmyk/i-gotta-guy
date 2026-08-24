import Link from "next/link";
import { redirect } from "next/navigation";
import { startOfMonth, startOfWeek } from "date-fns";
import { CheckCircle2, Clock3, Star, Wallet, XCircle } from "lucide-react";
import { getGuyContext, guyStatusKind } from "../_lib/data";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { formatDateTime } from "@/components/guy/format";

export const metadata = { title: "Earnings" };

type PayoutRow = {
  id: string;
  amount_cents: number;
  status: "pending" | "in_transit" | "paid" | "failed";
  created_at: string;
  paid_at: string | null;
  jobs: { city: string; state: string; services: { name: string } | null } | null;
};

const STATUS_STYLE: Record<PayoutRow["status"], { variant: "trust" | "warn" | "danger" | "muted"; icon: typeof Wallet; label: string }> = {
  paid: { variant: "trust", icon: CheckCircle2, label: "Paid" },
  in_transit: { variant: "warn", icon: Clock3, label: "In transit" },
  pending: { variant: "muted", icon: Clock3, label: "Pending" },
  failed: { variant: "danger", icon: XCircle, label: "Failed" },
};

export default async function GuyEarningsPage() {
  const { supabase, user, guyProfile } = await getGuyContext();
  const status = guyStatusKind(guyProfile);
  if (status !== "approved") redirect("/guy");

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();
  const monthStart = startOfMonth(new Date()).toISOString();

  const { data: payoutRows, error: payoutsErr } = await supabase
    .from("provider_payouts")
    .select("*, jobs(city, state, services(name))")
    .eq("guy_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (payoutsErr) throw new Error(`Could not load your earnings: ${payoutsErr.message}`);

  const payouts = (payoutRows as unknown as PayoutRow[] | null) ?? [];
  const paid = payouts.filter((p) => p.status === "paid");

  const sumSince = (iso: string) =>
    paid.filter((p) => p.paid_at && p.paid_at >= iso).reduce((sum, p) => sum + p.amount_cents, 0);

  const weekTotal = sumSince(weekStart);
  const monthTotal = sumSince(monthStart);
  const allTimeTotal = paid.reduce((sum, p) => sum + p.amount_cents, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Earnings</h1>
        <p className="mt-1 text-sm text-ink-soft">Your payout history and running totals.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <TotalCard label="This week" cents={weekTotal} />
        <TotalCard label="This month" cents={monthTotal} />
        <TotalCard label="All time" cents={allTimeTotal} />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:w-1/2">
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
            <Wallet className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-ink">{guyProfile?.completed_jobs_count ?? 0}</p>
            <p className="text-xs text-ink-soft">Completed jobs</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink/5 text-ink-soft">
            <Star className="h-4 w-4" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-ink">
              {guyProfile?.avg_rating ? guyProfile.avg_rating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-ink-soft">
              {guyProfile?.rating_count ? `${guyProfile.rating_count} reviews` : "No reviews yet"}
            </p>
          </div>
        </Card>
      </div>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Payout history</h2>
        {payouts.length === 0 ? (
          <EmptyState
            title="No payouts yet"
            description="Complete a job and your payout will show up here shortly after."
          />
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line">
            <div className="divide-y divide-line">
              {payouts.map((p) => {
                const style = STATUS_STYLE[p.status];
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 bg-paper-raised px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {p.jobs?.services?.name ?? "Service"}
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        {p.jobs ? `${p.jobs.city}, ${p.jobs.state} · ` : ""}
                        {formatDateTime(p.paid_at ?? p.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={style.variant} className="gap-1">
                        <style.icon className="h-3 w-3" />
                        {style.label}
                      </Badge>
                      <span className="w-20 text-right text-sm font-semibold text-ink">
                        {formatCents(p.amount_cents)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <p className="text-center text-xs text-ink-soft">
        Questions about a payout?{" "}
        <Link href="/guy/support" className="font-medium text-brand hover:underline">
          Contact support
        </Link>
        .
      </p>
    </div>
  );
}

function TotalCard({ label, cents }: { label: string; cents: number }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold text-trust-dark">{formatCents(cents)}</p>
    </Card>
  );
}
