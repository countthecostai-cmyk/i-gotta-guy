import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";
import { getGuyContext } from "../_lib/data";
import { SupportTicketForm } from "@/components/guy/support-ticket-form";
import { formatDateTime } from "@/components/guy/format";
import { Badge, Card, EmptyState } from "@/components/ui/primitives";

export const metadata = { title: "Support" };

const STATUS_VARIANT: Record<string, "trust" | "warn" | "muted" | "brand"> = {
  open: "brand",
  in_progress: "warn",
  resolved: "trust",
  closed: "muted",
};

export default async function GuySupportPage() {
  const { supabase, user } = await getGuyContext();
  if (!user) redirect("/login?next=/guy/support");

  const { data: tickets } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Support</h1>
        <p className="mt-1 text-sm text-ink-soft">Questions about a job, a payout, or your account? We&apos;re here to help.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <SupportTicketForm />
      </Card>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <LifeBuoy className="h-5 w-5 text-ink-soft" />
          <h2 className="font-display text-lg font-semibold text-ink">Your tickets</h2>
        </div>
        {!tickets || tickets.length === 0 ? (
          <EmptyState title="No tickets yet" description="Tickets you submit will show up here." />
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-ink">{t.subject}</p>
                  <Badge variant={STATUS_VARIANT[t.status] ?? "muted"}>{t.status.replace("_", " ")}</Badge>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink-soft">{t.body}</p>
                <p className="mt-2 text-xs text-ink-soft">{formatDateTime(t.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
