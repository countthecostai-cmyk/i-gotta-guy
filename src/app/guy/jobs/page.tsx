import { redirect } from "next/navigation";
import { Briefcase, Search } from "lucide-react";
import { getGuyContext, guyStatusKind } from "../_lib/data";
import { OpenJobCard } from "@/components/guy/open-job-card";
import { JobListItem } from "@/components/guy/job-list-item";
import type { GuyJobWithService } from "@/components/guy/types";
import { EmptyState } from "@/components/ui/primitives";
import type { JobStatus } from "@/lib/domain/job-state-machine";

export const metadata = { title: "Jobs" };

const AWAITING_CUSTOMER: JobStatus[] = ["QUOTED"];
const ACTIVE: JobStatus[] = ["ACCEPTED", "SCHEDULED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS"];
const WRAPPED_UP: JobStatus[] = ["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"];
const CLOSED: JobStatus[] = ["CANCELLED", "DECLINED", "EXPIRED", "REFUNDED", "DISPUTED"];

export default async function GuyJobsPage() {
  const { supabase, user, guyProfile } = await getGuyContext();
  const status = guyStatusKind(guyProfile);
  if (status !== "approved") redirect("/guy");

  const [{ data: openRaw, error: openErr }, { data: mineRaw, error: mineErr }] = await Promise.all([
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
  ]);
  // A failed query must not render as "no jobs" — that's misleading for a
  // page directly tied to a Guy's income (missing an open job, or thinking
  // an active job disappeared). Throw so error.tsx shows a real error
  // with a retry instead.
  if (openErr) throw new Error(`Could not load open jobs: ${openErr.message}`);
  if (mineErr) throw new Error(`Could not load your jobs: ${mineErr.message}`);

  const openJobs = (openRaw as unknown as GuyJobWithService[] | null) ?? [];
  const mineJobs = (mineRaw as unknown as GuyJobWithService[] | null) ?? [];

  const active = mineJobs.filter((j) => ACTIVE.includes(j.status as JobStatus));
  const awaiting = mineJobs.filter((j) => AWAITING_CUSTOMER.includes(j.status as JobStatus));
  const wrappedUp = mineJobs.filter((j) => WRAPPED_UP.includes(j.status as JobStatus)).slice(0, 10);
  const closed = mineJobs.filter((j) => CLOSED.includes(j.status as JobStatus)).slice(0, 10);

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
            description="New job requests for the services you offer will show up here. Check back soon."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {openJobs.map((job) => (
              <OpenJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

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
            <JobGroup title="Awaiting customer" jobs={awaiting} />
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
