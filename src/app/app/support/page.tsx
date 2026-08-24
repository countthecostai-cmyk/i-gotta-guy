import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { SupportTicketForm } from "@/components/customer/support-ticket-form";
import { formatShortDate } from "@/components/customer/format";

export const metadata = { title: "Support" };

const STATUS_VARIANT: Record<string, "default" | "trust" | "brand" | "warn" | "danger" | "muted"> = {
  open: "brand",
  in_progress: "warn",
  resolved: "trust",
  closed: "muted",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ jobId?: string }>;
}) {
  const { jobId } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/support");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Help & support</h1>
        <p className="mt-1 text-sm text-ink-soft">Something wrong with a job, or a general question? We&apos;re here.</p>
      </div>

      <SupportTicketForm jobId={jobId ?? null} />

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">Your tickets</h2>
        {tickets && tickets.length > 0 ? (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{t.subject}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{t.body}</p>
                    <p className="mt-1 text-xs text-ink-soft/70">{formatShortDate(t.created_at)}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status] ?? "muted"}>{STATUS_LABEL[t.status] ?? t.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState title="No support tickets yet" description="Submit one above and it'll show up here." />
        )}
      </section>
    </div>
  );
}
