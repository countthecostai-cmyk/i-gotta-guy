import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/primitives";
import { JobStatusBadge } from "@/components/customer/status-badge";
import { StatusTimeline } from "@/components/customer/status-timeline";
import { PriceBreakdown } from "@/components/customer/price-breakdown";
import { GuyCard } from "@/components/customer/guy-card";
import { MessageThread } from "@/components/customer/message-thread";
import { QuoteActions } from "@/components/customer/quote-actions";
import { CancelJobButton } from "@/components/customer/cancel-job-button";
import { ReviewForm } from "@/components/customer/review-form";
import { TipButton } from "@/components/customer/tip-button";
import { JobPhotosGallery } from "@/components/customer/job-photos-gallery";
import { formatJobDate, formatShortDate } from "@/components/customer/format";
import { canTransition, type JobStatus } from "@/lib/domain/job-state-machine";
import type { Database, PricingModel } from "@/types/database";

export const metadata = { title: "Job details" };

type JobDetailRow = Database["public"]["Tables"]["jobs"]["Row"] & {
  services: { name: string; slug: string; pricing_model: PricingModel } | null;
  addresses: { line1: string; line2: string | null; city: string; state: string; postal_code: string } | null;
};

const DONE_STATUSES: JobStatus[] = ["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"];

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/app/jobs/${id}`);

  const { data: jobRaw, error: jobErr } = await supabase
    .from("jobs")
    .select("*, services(name, slug, pricing_model), addresses(line1, line2, city, state, postal_code)")
    .eq("id", id)
    .eq("customer_id", user.id)
    .maybeSingle();

  // Only a genuinely missing/not-yours job is a 404 — a real query error
  // (DB blip, network hiccup) must surface as an error, not "job not
  // found", which would wrongly read as "this job doesn't exist."
  if (jobErr) throw new Error(`Could not load this job: ${jobErr.message}`);
  if (!jobRaw) notFound();
  const job = jobRaw as unknown as JobDetailRow;

  const [
    { data: history, error: historyErr },
    { data: messages, error: messagesErr },
    { data: myReview },
    { data: photos, error: photosErr },
  ] = await Promise.all([
    supabase
      .from("job_status_history")
      .select("id, status, note, created_at")
      .eq("job_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("job_id", id).order("created_at", { ascending: true }),
    supabase.from("reviews").select("id").eq("job_id", id).eq("author_id", user.id).maybeSingle(),
    supabase.from("job_photos").select("id, url, stage").eq("job_id", id).order("created_at", { ascending: true }),
  ]);
  if (historyErr || messagesErr || photosErr) throw new Error("Could not load all the details for this job. Please try again.");

  const guyPromise = job.guy_id
    ? supabase.from("public_guy_profiles").select("*").eq("id", job.guy_id).maybeSingle()
    : Promise.resolve({ data: null });
  const quotePromise =
    job.status === "QUOTED"
      ? supabase
          .from("quotes")
          .select("amount_cents, note")
          .eq("job_id", id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null });

  const [{ data: guy }, { data: pendingQuote }] = await Promise.all([guyPromise, quotePromise]);

  const status = job.status as JobStatus;
  const isDone = DONE_STATUSES.includes(status);
  const canCancel = canTransition(status, "CANCELLED");
  const serviceName = job.services?.name ?? "Service";

  return (
    <div className="space-y-6">
      <Link href="/app/jobs" className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft className="h-4 w-4" />
        All jobs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{serviceName}</h1>
          <p className="mt-1 text-sm text-ink-soft">Requested {formatShortDate(job.created_at)}</p>
        </div>
        <JobStatusBadge status={status} />
      </div>

      {pendingQuote && (
        <QuoteActions jobId={job.id} amountCents={pendingQuote.amount_cents} note={pendingQuote.note ?? ""} />
      )}

      <Card className="divide-y divide-line p-0">
        <div className="flex items-start gap-3 p-4">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Location</p>
            {job.addresses ? (
              <p className="mt-0.5 text-sm text-ink">
                {job.addresses.line1}
                {job.addresses.line2 ? `, ${job.addresses.line2}` : ""}, {job.addresses.city}, {job.addresses.state}{" "}
                {job.addresses.postal_code}
              </p>
            ) : (
              <p className="mt-0.5 text-sm text-ink">{job.city}, {job.state}</p>
            )}
          </div>
        </div>
        <div className="flex items-start gap-3 p-4">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">When</p>
            <p className="mt-0.5 text-sm text-ink">{job.is_asap ? "ASAP" : formatJobDate(job.scheduled_start)}</p>
          </div>
        </div>
        {job.description && (
          <div className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Notes</p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-ink">{job.description}</p>
          </div>
        )}
      </Card>

      {guy && <GuyCard guy={guy} />}

      {photos && photos.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-ink">Photos</h2>
          <JobPhotosGallery photos={photos} />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">Status</h2>
        <Card className="p-4">
          <StatusTimeline history={history ?? []} currentStatus={status} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">Price</h2>
        <Card className="p-4">
          <PriceBreakdown
            lines={[
              { label: "Service amount", cents: job.service_amount_cents },
              { label: "Add-ons", cents: job.addon_amount_cents, muted: true },
              { label: "Discount", cents: job.discount_cents, isSubtraction: true, muted: true },
              { label: "Tax", cents: job.tax_cents, muted: true },
              { label: "Platform fee", cents: job.platform_fee_cents },
              { label: "Tip", cents: job.tip_cents, muted: true },
            ]}
            totalCents={job.total_cents}
            totalLabel="Total"
            isEstimate={job.services?.pricing_model === "quote" && job.service_amount_cents === 0}
          />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-semibold text-ink">Messages</h2>
        <MessageThread jobId={job.id} currentUserId={user.id} messages={messages ?? []} guyAssigned={Boolean(job.guy_id)} />
      </section>

      {isDone && !myReview && <ReviewForm jobId={job.id} />}
      {isDone && myReview && (
        <Card className="p-4 text-sm text-ink-soft">You already reviewed this job. Thanks for the feedback!</Card>
      )}

      {isDone && job.guy_id && <TipButton jobId={job.id} alreadyTippedCents={job.tip_cents} />}

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {canCancel && <CancelJobButton jobId={job.id} />}
        <Link
          href={`/app/support?jobId=${job.id}`}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <LifeBuoy className="h-4 w-4" />
          Need help with this job?
        </Link>
      </div>
    </div>
  );
}
