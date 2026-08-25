import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/primitives";
import { ServiceBrowser, type CategoryGroup } from "@/components/customer/service-browser";
import { JobCard, type JobCardData } from "@/components/customer/job-card";
import type { ServiceLite } from "@/components/customer/service-tile";
import { IN_FLIGHT_STATUSES } from "@/components/customer/job-status-groups";
import { jobDisplayTitle } from "@/lib/domain/job-display";
import type { JobStatus } from "@/lib/domain/job-state-machine";
import type { Database } from "@/types/database";

export const metadata = { title: "Home" };

const HOME_ACTIVE_STATUSES = IN_FLIGHT_STATUSES;

type JobWithService = Database["public"]["Tables"]["jobs"]["Row"] & {
  services: { name: string; slug: string } | null;
};

function toJobCardData(job: JobWithService): JobCardData {
  return {
    id: job.id,
    status: job.status as JobStatus,
    serviceName: jobDisplayTitle(job.details, job.services?.name ?? "Service"),
    serviceSlug: job.services?.slug ?? "",
    city: job.city,
    state: job.state,
    scheduledStart: job.scheduled_start,
    isAsap: job.is_asap,
    totalCents: job.total_cents,
    createdAt: job.created_at,
  };
}

export default async function CustomerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app");

  const [
    { data: categories, error: categoriesErr },
    { data: services, error: servicesErr },
    { data: activeJobsRaw, error: activeJobsErr },
    { data: historyJobsRaw, error: historyJobsErr },
  ] = await Promise.all([
      supabase.from("service_categories").select("*").eq("active", true).order("sort_order"),
      supabase.from("services").select("*").eq("active", true).order("sort_order"),
      supabase
        .from("jobs")
        .select("*, services(name, slug)")
        .eq("customer_id", user.id)
        .in("status", HOME_ACTIVE_STATUSES)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("jobs")
        .select("*, services(name, slug)")
        .eq("customer_id", user.id)
        .not("status", "in", `(${HOME_ACTIVE_STATUSES.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);
  // A failed query here must not render as "you have no services/jobs" —
  // that's indistinguishable from a real empty state and hides a DB outage
  // from the user (and from us).
  if (categoriesErr || servicesErr) throw new Error("Could not load services. Please try again.");
  if (activeJobsErr || historyJobsErr) throw new Error("Could not load your jobs. Please try again.");

  const categoryById = new Map((categories ?? []).map((c) => [c.id, c]));
  const groups: CategoryGroup[] = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    icon: c.icon,
    services: [],
  }));
  const groupById = new Map(groups.map((g) => [g.id, g]));

  for (const s of services ?? []) {
    const category = categoryById.get(s.category_id);
    const group = groupById.get(s.category_id);
    if (!group) continue;
    const lite: ServiceLite = {
      id: s.id,
      name: s.name,
      slug: s.slug,
      short_description: s.short_description,
      pricing_model: s.pricing_model,
      min_price_cents: s.min_price_cents,
      categoryName: category?.name ?? "",
      categoryIcon: category?.icon ?? "",
    };
    group.services.push(lite);
  }
  const nonEmptyGroups = groups.filter((g) => g.services.length > 0);
  const popular = nonEmptyGroups.flatMap((g) => g.services).slice(0, 6);

  const activeJobs = (activeJobsRaw as unknown as JobWithService[] | null) ?? [];
  const historyJobs = (historyJobsRaw as unknown as JobWithService[] | null) ?? [];
  const isBrandNew = activeJobs.length === 0 && historyJobs.length === 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">What do you need done?</h1>
        <p className="mt-1 text-sm text-ink-soft">Tell us what you need — we&apos;ll find you a Guy.</p>
      </div>

      {nonEmptyGroups.length > 0 ? (
        <ServiceBrowser categories={nonEmptyGroups} popular={popular} />
      ) : (
        <EmptyState
          title="Services coming soon"
          description="We're setting up the service catalog for your area. Check back shortly."
        />
      )}

      {activeJobs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Active jobs</h2>
            <Link href="/app/jobs" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <JobCard key={job.id} job={toJobCardData(job)} />
            ))}
          </div>
        </section>
      )}

      {historyJobs.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-ink">Book again</h2>
            <Link href="/app/jobs" className="text-sm font-medium text-brand hover:underline">
              View history
            </Link>
          </div>
          <div className="space-y-3">
            {historyJobs.map((job) => (
              <JobCard key={job.id} job={toJobCardData(job)} showRebook />
            ))}
          </div>
        </section>
      )}

      {isBrandNew && nonEmptyGroups.length > 0 && (
        <EmptyState
          title="No jobs yet"
          description="Pick a service above to request your first job — you'll see it tracked here from start to finish."
        />
      )}
    </div>
  );
}
