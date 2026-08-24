import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { formatDate, initials } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { GuyStatusBadge } from "@/components/admin/StatusBadges";
import { GuyRowActions } from "@/components/admin/GuyRowActions";
import { Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { GuyStatus } from "@/types/database";

export const metadata = { title: "Guys" };

const TABS: { value: GuyStatus | "all"; label: string }[] = [
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

export default async function GuysPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { admin } = await requireAdminContext();
  const { status: statusParam } = await searchParams;
  const status = (TABS.find((t) => t.value === statusParam)?.value ?? "pending") as GuyStatus | "all";

  let query = admin
    .from("guy_profiles")
    .select(
      "id, status, bio, years_experience, identity_verified, background_check_status, avg_rating, rating_count, completed_jobs_count, applied_at, approved_at",
    )
    .order("applied_at", { ascending: false })
    .limit(200);

  if (status !== "all") query = query.eq("status", status);

  const { data: guys, error } = await query;

  const profileById = new Map<string, { full_name: string; phone: string | null }>();
  if (guys && guys.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, phone")
      .in(
        "id",
        guys.map((g) => g.id),
      );
    for (const p of profiles ?? []) profileById.set(p.id, p);
  }

  return (
    <div>
      <PageHeader title="Guys" description="Review applications, manage provider status, and audit provider accounts." />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-ink/5 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "pending" ? "/admin/guys" : `/admin/guys?status=${tab.value}`}
            className={cn(
              "shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              status === tab.value ? "bg-paper-raised text-ink shadow-sm" : "text-ink-soft hover:text-ink",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {error ? (
        <Card className="p-6 text-sm text-danger">Failed to load Guys: {error.message}</Card>
      ) : !guys || guys.length === 0 ? (
        <EmptyState
          title={status === "pending" ? "No pending applications" : "No Guys in this view"}
          description={status === "pending" ? "New applications will show up here for review." : "Try a different status filter."}
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-ink-soft">
                <th className="px-4 py-3">Guy</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3">Jobs done</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {guys.map((g) => {
                const profile = profileById.get(g.id);
                return (
                  <tr key={g.id} className="border-b border-line last:border-0 hover:bg-ink/[0.02]">
                    <td className="px-4 py-3">
                      <Link href={`/admin/guys/${g.id}`} className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-xs font-semibold text-brand-dark">
                          {initials(profile?.full_name || "Guy")}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-ink hover:text-brand">{profile?.full_name || "Unnamed"}</p>
                          <p className="text-xs text-ink-soft">{profile?.phone || "No phone on file"}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <GuyStatusBadge status={g.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-soft">
                      {g.avg_rating ? `${g.avg_rating.toFixed(1)} ★ (${g.rating_count})` : "No ratings yet"}
                    </td>
                    <td className="px-4 py-3 text-ink-soft">{g.completed_jobs_count}</td>
                    <td className="px-4 py-3 text-ink-soft">{formatDate(g.applied_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <GuyRowActions guyId={g.id} status={g.status} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
