import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/primitives";
import { JobCard, type JobCardData } from "@/components/customer/job-card";
import { isInFlight } from "@/components/customer/job-status-groups";
import type { JobStatus } from "@/lib/domain/job-state-machine";
import type { Database } from "@/types/database";

export const metadata = { title: "Your jobs" };

type JobWithService = Database["public"]["Tables"]["jobs"]["Row"] & {
  services: { name: string; slug: string } | null;
};

export default async function JobsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/jobs");

  const { data: jobsRaw, error } = await supabase
    .from("jobs")
    .select("*, services(name, slug)")
    .eq("customer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const jobs = (jobsRaw as JobWithService[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Your jobs</h1>
        <p className="mt-1 text-sm text-ink-soft">Everything you&apos;ve requested, in one place.</p>
      </div>

      {error && <p className="text-sm text-danger">Couldn&apos;t load your jobs. Please refresh.</p>}

      {!error && jobs.length === 0 && (
        <EmptyState
          title="No jobs yet"
          description="When you request a service, it'll show up here so you can track it from start to finish."
          action={
            <Link href="/app" className="text-sm font-medium text-brand hover:underline">
              Browse services
            </Link>
          }
        />
      )}

      <div className="space-y-3">
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={
              {
                id: job.id,
                status: job.status as JobStatus,
                serviceName: job.services?.name ?? "Service",
                serviceSlug: job.services?.slug ?? "",
                city: job.city,
                state: job.state,
                scheduledStart: job.scheduled_start,
                isAsap: job.is_asap,
                totalCents: job.total_cents,
                createdAt: job.created_at,
              } satisfies JobCardData
            }
            showRebook={!isInFlight(job.status as JobStatus)}
          />
        ))}
      </div>
    </div>
  );
}
