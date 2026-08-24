import Link from "next/link";
import { requireAdminContext } from "../_lib/require-admin";
import { formatDateTime } from "../_lib/format";
import { PageHeader } from "@/components/admin/PageHeader";
import { TicketStatusControl } from "@/components/admin/TicketStatusControl";
import { Card, EmptyState } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export const metadata = { title: "Support" };

const TABS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
] as const;

export default async function SupportAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { admin } = await requireAdminContext();
  const { status: statusParam } = await searchParams;
  const status = TABS.some((t) => t.value === statusParam) ? statusParam! : "open";

  let query = admin
    .from("support_tickets")
    .select("id, subject, body, status, created_at, job_id, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  if (status !== "all") query = query.eq("status", status);

  const { data: tickets, error } = await query;

  const requesterNameById = new Map<string, string>();
  if (tickets && tickets.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name")
      .in(
        "id",
        tickets.map((t) => t.user_id),
      );
    for (const p of profiles ?? []) requesterNameById.set(p.id, p.full_name);
  }

  return (
    <div>
      <PageHeader title="Support" description="Customer and Guy support requests." />

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-ink/5 p-1 w-fit">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={tab.value === "open" ? "/admin/support" : `/admin/support?status=${tab.value}`}
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
        <Card className="p-6 text-sm text-danger">Failed to load tickets: {error.message}</Card>
      ) : !tickets || tickets.length === 0 ? (
        <EmptyState title="No tickets in this view" description="Support requests will show up here." />
      ) : (
        <div className="space-y-4">
          {tickets.map((t) => (
            <Card key={t.id} className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-display text-base font-semibold text-ink">{t.subject}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {requesterNameById.get(t.user_id) ?? "Unknown"} · {formatDateTime(t.created_at)}
                    {t.job_id && (
                      <>
                        {" · "}
                        <Link href={`/admin/jobs/${t.job_id}`} className="text-brand hover:underline">
                          Related job
                        </Link>
                      </>
                    )}
                  </p>
                  <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-ink-soft">{t.body}</p>
                </div>
                <div className="shrink-0">
                  <TicketStatusControl ticketId={t.id} status={t.status as "open" | "in_progress" | "resolved" | "closed"} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
