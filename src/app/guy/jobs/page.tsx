import { redirect } from "next/navigation";
import { Briefcase, Handshake, Search } from "lucide-react";
import { getGuyContext, guyStatusKind } from "../_lib/data";
import { OpenJobCard } from "@/components/guy/open-job-card";
import { JobListItem } from "@/components/guy/job-list-item";
import { MyOfferCard } from "@/components/guy/my-offer-card";
import type { OfferThreadData } from "@/components/guy/offer-thread-panel";
import type { GuyJobWithService } from "@/components/guy/types";
import { EmptyState } from "@/components/ui/primitives";
import { jobDisplayTitle } from "@/lib/domain/job-display";
import type { JobStatus } from "@/lib/domain/job-state-machine";

export const metadata = { title: "Jobs" };

const ACTIVE: JobStatus[] = ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
const WRAPPED_UP: JobStatus[] = ["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"];
const CLOSED: JobStatus[] = ["CANCELLED", "DECLINED", "EXPIRED", "REFUNDED", "DISPUTED"];

export default async function GuyJobsPage() {
  const { supabase, user, guyProfile } = await getGuyContext();
  const status = guyStatusKind(guyProfile);
  if (status !== "approved") redirect("/guy");

  const [
    { data: openRaw, error: openErr },
    { data: mineRaw, error: mineErr },
    { data: myQuoteRows, error: quotesErr },
    { data: myServiceRows, error: myServicesErr },
  ] = await Promise.all([
    // Every open job in the pool, regardless of which services this Guy
    // has toggled on — see migration 0023 and the comment below on
    // myActiveServiceIds for why the toggle is a sort preference, not a
    // visibility filter.
    supabase
      .from("jobs")
      .select("*, services(name, pricing_model, unit_label)")
      .eq("status", "MATCHING")
      .is("guy_id", null)
      .order("is_asap", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(30),
    supabase
      .from("jobs")
      .select("*, services(name, pricing_model, unit_label)")
      .eq("guy_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(60),
    // This Guy's own offer threads — collapsed below to the latest per
    // job to find which ones are still open and awaiting action.
    supabase
      .from("quotes")
      .select("job_id, status, proposed_by, amount_cents, note, created_at, jobs!inner(id, status, guy_id, city, state, postal_code, description, is_asap, scheduled_start, details, services(name))")
      .eq("guy_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("guy_services").select("service_id").eq("guy_id", user!.id).eq("active", true),
  ]);
  // A failed query must not render as "no jobs" — that's misleading for a
  // page directly tied to a Guy's income (missing an open job, or thinking
  // an active job disappeared). Throw so error.tsx shows a real error
  // with a retry instead.
  if (openErr) throw new Error(`Could not load open jobs: ${openErr.message}`);
  if (mineErr) throw new Error(`Could not load your jobs: ${mineErr.message}`);
  if (quotesErr) throw new Error(`Could not load your offers: ${quotesErr.message}`);
  if (myServicesErr) throw new Error(`Could not load your services: ${myServicesErr.message}`);

  const openJobsRaw = (openRaw as unknown as GuyJobWithService[] | null) ?? [];
  const mineJobs = (mineRaw as unknown as GuyJobWithService[] | null) ?? [];

  // Every approved Guy sees every open job — the services a Guy has
  // toggled on in their profile are a sorting preference, not a filter, so
  // jobs matching what they offer surface first without hiding anything
  // else. `Array.prototype.sort` is stable, so within each group the
  // existing is_asap/created_at ordering from the query is preserved.
  const myActiveServiceIds = new Set((myServiceRows ?? []).map((r) => r.service_id));
  const openJobs = [...openJobsRaw].sort((a, b) => {
    const aMatch = myActiveServiceIds.has(a.service_id) ? 0 : 1;
    const bMatch = myActiveServiceIds.has(b.service_id) ? 0 : 1;
    return aMatch - bMatch;
  });

  const active = mineJobs.filter((j) => ACTIVE.includes(j.status as JobStatus));
  const wrappedUp = mineJobs.filter((j) => WRAPPED_UP.includes(j.status as JobStatus)).slice(0, 10);
  const closed = mineJobs.filter((j) => CLOSED.includes(j.status as JobStatus)).slice(0, 10);

  // Collapse this Guy's quotes (an append-only event log) to the latest
  // thread per job, then keep only the ones still open for negotiation.
  type QuoteThreadRow = {
    job_id: string;
    status: string;
    proposed_by: string;
    amount_cents: number;
    note: string | null;
    created_at: string;
    jobs: { id: string; status: string; guy_id: string | null; city: string; state: string; postal_code: string; description: string | null; is_asap: boolean; scheduled_start: string | null; details: unknown; services: { name: string } | null };
  };
  const latestByJob = new Map<string, QuoteThreadRow>();
  for (const row of (myQuoteRows as unknown as QuoteThreadRow[] | null) ?? []) {
    if (!latestByJob.has(row.job_id)) latestByJob.set(row.job_id, row);
  }
  const myOpenOffers = [...latestByJob.values()].filter(
    (row) => row.status === "pending" && row.jobs.status === "MATCHING" && row.jobs.guy_id === null,
  );

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-5 w-5 text-ink-soft" />
          <h1 className="font-display text-xl font-bold text-ink sm:text-2xl">Open jobs near you</h1>
        </div>
        {openJobs.length === 0 ? (
          <EmptyState
            title="No open jobs right now"
            description="New job requests in your area will show up here. Check back soon."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {openJobs.map((job) => {
              const t = latestByJob.get(job.id);
              const myThread: OfferThreadData | null =
                t && t.status !== "accepted"
                  ? { status: t.status, proposedBy: t.proposed_by as OfferThreadData["proposedBy"], amountCents: t.amount_cents, note: t.note ?? "" }
                  : null;
              return (
                <OpenJobCard
                  key={job.id}
                  job={job}
                  myThread={myThread}
                  isMatch={myActiveServiceIds.has(job.service_id)}
                />
              );
            })}
          </div>
        )}
      </section>

      {myOpenOffers.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Handshake className="h-5 w-5 text-ink-soft" />
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">My offers</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {myOpenOffers.map((row) => (
              <MyOfferCard
                key={row.job_id}
                job={{
                  id: row.jobs.id,
                  serviceName: jobDisplayTitle(row.jobs.details, row.jobs.services?.name ?? "Service"),
                  city: row.jobs.city,
                  state: row.jobs.state,
                  postalCode: row.jobs.postal_code,
                  description: row.jobs.description ?? "",
                  isAsap: row.jobs.is_asap,
                  scheduledStart: row.jobs.scheduled_start,
                }}
                thread={{
                  status: row.status,
                  proposedBy: row.proposed_by as OfferThreadData["proposedBy"],
                  amountCents: row.amount_cents,
                  note: row.note ?? "",
                }}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl">My jobs</h2>
        </div>

        {mineJobs.length === 0 ? (
          <EmptyState title="No jobs yet" description="Accept an open job above to get started." />
        ) : (
          <div className="space-y-6">
            <JobGroup title="Active" jobs={active} />
            <JobGroup title="Recently completed" jobs={wrappedUp} />
            <JobGroup title="Closed" jobs={closed} />
          </div>
        )}
      </section>
    </div>
  );
}

function JobGroup({ title, jobs }: { title: string; jobs: GuyJobWithService[] }) {
  if (jobs.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">{title}</h3>
      <div className="space-y-3">
        {jobs.map((job) => (
          <JobListItem key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
