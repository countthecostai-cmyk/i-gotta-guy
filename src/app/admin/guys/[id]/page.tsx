import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminContext } from "../../_lib/require-admin";
import { formatDate, formatDateTime, initials } from "../../_lib/format";
import { GuyStatusBadge, JobStatusBadge } from "@/components/admin/StatusBadges";
import { GuyRowActions } from "@/components/admin/GuyRowActions";
import { Card, Badge } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import type { JobStatus } from "@/lib/domain/job-state-machine";

export const metadata = { title: "Guy detail" };

export default async function GuyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { admin } = await requireAdminContext();

  const { data: guy } = await admin
    .from("guy_profiles")
    .select(
      "id, status, bio, years_experience, identity_verified, background_check_status, avg_rating, rating_count, completed_jobs_count, applied_at, approved_at, is_available",
    )
    .eq("id", id)
    .maybeSingle();

  if (!guy) notFound();

  const [{ data: profile }, servicesRes, areasRes, jobsRes] = await Promise.all([
    admin.from("profiles").select("full_name, phone").eq("id", id).maybeSingle(),
    admin.from("guy_services").select("service_id, active, custom_base_price_cents").eq("guy_id", id),
    admin.from("guy_service_areas").select("city, state, postal_code, radius_miles").eq("guy_id", id),
    admin
      .from("jobs")
      .select("id, service_id, status, city, state, total_cents, created_at")
      .eq("guy_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const services = servicesRes.data ?? [];
  const areas = areasRes.data ?? [];
  const jobs = jobsRes.data ?? [];

  const serviceIds = [...new Set([...services.map((s) => s.service_id), ...jobs.map((j) => j.service_id)])];
  const serviceNameById = new Map<string, string>();
  if (serviceIds.length > 0) {
    const { data: svcRows } = await admin.from("services").select("id, name").in("id", serviceIds);
    for (const s of svcRows ?? []) serviceNameById.set(s.id, s.name);
  }

  return (
    <div>
      <Link href="/admin/guys" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={15} /> Back to Guys
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light text-lg font-semibold text-brand-dark">
            {initials(profile?.full_name || "Guy")}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-ink">{profile?.full_name || "Unnamed Guy"}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <GuyStatusBadge status={guy.status} />
              {guy.identity_verified && <Badge variant="trust">Identity verified</Badge>}
              {guy.background_check_status === "passed" && <Badge variant="trust">Background check passed</Badge>}
              {!guy.is_available && <Badge variant="muted">Paused by provider</Badge>}
            </div>
          </div>
        </div>
        <GuyRowActions guyId={guy.id} status={guy.status} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Rating</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink">
            {guy.avg_rating ? `${guy.avg_rating.toFixed(1)} ★` : "—"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">{guy.rating_count} reviews</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Completed jobs</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink">{guy.completed_jobs_count}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Applied</p>
          <p className="mt-1.5 font-display text-2xl font-bold text-ink">{formatDate(guy.applied_at)}</p>
          {guy.approved_at && <p className="mt-1 text-xs text-ink-soft">Approved {formatDate(guy.approved_at)}</p>}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h2 className="font-display text-base font-semibold text-ink">Profile</h2>
          <dl className="mt-3 space-y-2.5 text-sm">
            <div>
              <dt className="text-xs text-ink-soft">Phone</dt>
              <dd className="text-ink">{profile?.phone || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Years of experience</dt>
              <dd className="text-ink">{guy.years_experience ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Bio</dt>
              <dd className="whitespace-pre-wrap text-ink">{guy.bio || "No bio provided."}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-soft">Background check</dt>
              <dd className="text-ink capitalize">{guy.background_check_status}</dd>
            </div>
          </dl>

          <h3 className="mt-5 font-display text-sm font-semibold text-ink">Services offered</h3>
          {services.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">No services configured yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {services.map((s) => (
                <li key={s.service_id} className="flex items-center justify-between">
                  <span className={s.active ? "text-ink" : "text-ink-soft line-through"}>
                    {serviceNameById.get(s.service_id) ?? "Service"}
                  </span>
                  {s.custom_base_price_cents != null && (
                    <span className="text-xs text-ink-soft">{formatCents(s.custom_base_price_cents)}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h3 className="mt-5 font-display text-sm font-semibold text-ink">Service areas</h3>
          {areas.length === 0 ? (
            <p className="mt-2 text-sm text-ink-soft">No service area defined yet.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm text-ink">
              {areas.map((a, i) => (
                <li key={i}>
                  {a.city ? `${a.city}, ${a.state}` : a.postal_code} — {a.radius_miles}mi radius
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-x-auto p-0 lg:col-span-2">
          <div className="border-b border-line p-5 pb-3">
            <h2 className="font-display text-base font-semibold text-ink">Recent jobs</h2>
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
