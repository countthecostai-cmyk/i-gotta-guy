import Link from "next/link";
import { startOfWeek } from "date-fns";
import { ArrowRight, Briefcase, CalendarClock, ClipboardList, Star, Wallet } from "lucide-react";
import { getGuyContext, guyStatusKind } from "./_lib/data";
import { PendingReviewCard, RejectedCard, SuspendedCard, ApplyPromptCard } from "@/components/guy/status-screens";
import { JobListItem } from "@/components/guy/job-list-item";
import type { GuyJobWithService } from "@/components/guy/types";
import { Card, EmptyState } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import type { JobStatus } from "@/lib/domain/job-state-machine";

const ACTION_NEEDED_STATUSES: JobStatus[] = ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];

export default async function GuyHomePage() {
  const { supabase, user, guyProfile } = await getGuyContext();
  const status = guyStatusKind(guyProfile);

  if (status === "none") return <ApplyPromptCard />;
  if (status === "pending") return <PendingReviewCard />;
  if (status === "rejected") return <RejectedCard />;
  if (status === "suspended") return <SuspendedCard />;

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }).toISOString();

  const [{ data: activeJobs, error: jobsErr }, { data: weekPayouts, error: payoutsErr }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*, services(name, pricing_model, unit_label)")
      .eq("guy_id", user!.id)
      .in("status", ACTION_NEEDED_STATUSES)
      .order("scheduled_start", { ascending: true, nullsFirst: true })
      .limit(10),
    supabase
      .from("provider_payouts")
      .select("amount_cents")
      .eq("guy_id", user!.id)
      .eq("status", "paid")
      .gte("paid_at", weekStart),
  ]);
  // Don't render "$0 this week" / "no active jobs" on a real query failure
  // — that's a Guy's income and schedule, not a cosmetic empty state.
  if (jobsErr) throw new Error(`Could not load your active jobs: ${jobsErr.message}`);
  if (payoutsErr) throw new Error(`Could not load this week's earnings: ${payoutsErr.message}`);

  const weekEarningsCents = (weekPayouts ?? []).reduce((sum, p) => sum + p.amount_cents, 0);
  const jobs = (activeJobs as unknown as GuyJobWithService[] | null) ?? [];

  const today = new Date();
  const todayJobs = jobs.filter((j) => {
    if (!j.scheduled_start) return false;
    const d = new Date(j.scheduled_start);
    return d.toDateString() === today.toDateString();
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Welcome back</h1>
        <p className="mt-1 text-sm text-ink-soft">Here&apos;s what&apos;s happening today.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Wallet} label="This week" value={formatCents(weekEarningsCents)} accent="trust" />
        <StatCard icon={ClipboardList} label="Completed jobs" value={String(guyProfile?.completed_jobs_count ?? 0)} />
        <StatCard
          icon={Star}
          label="Rating"
          value={guyProfile?.avg_rating ? guyProfile.avg_rating.toFixed(1) : "—"}
          sub={guyProfile?.rating_count ? `${guyProfile.rating_count} reviews` : "No reviews yet"}
        />
        <StatCard icon={Briefcase} label="Active jobs" value={String(jobs.length)} />
      </div>

      <Link
        href="/guy/jobs"
        className="flex items-center justify-between rounded-2xl border border-brand/30 bg-brand-light px-5 py-4 text-brand-dark transition-colors hover:bg-brand-light/80"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">Browse open jobs</p>
            <p className="text-sm opacity-80">Find new work near you</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5" />
      </Link>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">Today&apos;s schedule</h2>
        </div>
        {todayJobs.length === 0 ? (
          <EmptyState title="Nothing scheduled today" description="Jobs scheduled for today will show up here." />
        ) : (
          <div className="space-y-3">
            {todayJobs.map((job) => (
              <JobListItem key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-semibold text-ink">Needs your attention</h2>
        {jobs.length === 0 ? (
          <EmptyState
            title="No active jobs"
            description="Accepted and in-progress jobs will show up here so you always know what's next."
            action={
              <Link href="/guy/jobs" className="text-sm font-medium text-brand hover:underline">
                Find open jobs
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobListItem key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  sub?: string;
  accent?: "trust";
}) {
  return (
    <Card className="p-4">
      <div
        className={`mb-2 flex h-8 w-8 items-center justify-center rounded-full ${accent === "trust" ? "bg-trust-light text-trust-dark" : "bg-ink/5 text-ink-soft"}`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <p className="font-display text-xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-soft">{sub ?? label}</p>
    </Card>
  );
}
