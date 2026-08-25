import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MapPin, Navigation, Package, Zap } from "lucide-react";
import { getGuyContext, guyStatusKind } from "../../_lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCents } from "@/lib/domain/money";
import { calculateProviderPayout } from "@/lib/domain/pricing";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";
import { JobStatusBadge } from "@/components/guy/job-status-badge";
import { formatJobDate } from "@/components/guy/format";
import { AcceptJobButton } from "@/components/guy/accept-job-button";
import { OfferThreadPanel, type OfferThreadData } from "@/components/guy/offer-thread-panel";
import { JobStatusActions } from "@/components/guy/job-status-actions";
import { MessageThread, type ThreadMessage } from "@/components/guy/message-thread";
import { PhotoUploader, type JobPhotoData } from "@/components/guy/photo-uploader";
import { isSafeImageUrl } from "@/lib/domain/safe-url";
import { jobDisplayTitle } from "@/lib/domain/job-display";
import { ReviewForm } from "@/components/guy/review-form";
import { Card, ErrorState } from "@/components/ui/primitives";
import type { GuyJobDetail } from "@/components/guy/types";
import type { RequestField } from "@/types/database";

const REVIEWABLE_STATUSES: JobStatus[] = ["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"];

export default async function GuyJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, guyProfile } = await getGuyContext();
  const status = guyStatusKind(guyProfile);
  if (status !== "approved") redirect("/guy");

  const { data: jobRaw } = await supabase.from("jobs").select("*, services(*)").eq("id", id).maybeSingle();
  const job = jobRaw as GuyJobDetail | null;

  if (!job) {
    return (
      <div className="mx-auto max-w-2xl">
        <BackLink />
        <ErrorState message="This job doesn't exist, or it's no longer available to view." />
      </div>
    );
  }

  const isMine = job.guy_id === user!.id;
  const isOpenPool = job.status === "MATCHING" && job.guy_id === null;
  const isQuoteJob = job.services?.pricing_model === "quote";

  const [{ data: addonRows }, addressResult, { data: messageRows }, { data: photoRows }, { data: existingReview }, myThreadRows] =
    await Promise.all([
      job.addon_ids.length
        ? supabase.from("service_addons").select("id, name, price_cents").in("id", job.addon_ids)
        : Promise.resolve({ data: [] as { id: string; name: string; price_cents: number }[] }),
      isMine ? fetchAddressForAssignedGuy(job.address_id, job.id, user!.id) : Promise.resolve(null),
      isMine
        ? supabase.from("messages").select("*").eq("job_id", job.id).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as ThreadMessage[] }),
      isMine || isOpenPool
        ? supabase.from("job_photos").select("id, url, stage").eq("job_id", job.id).order("created_at", { ascending: true })
        : Promise.resolve({ data: [] as JobPhotoData[] }),
      isMine
        ? supabase.from("reviews").select("*").eq("job_id", job.id).eq("author_id", user!.id).maybeSingle()
        : Promise.resolve({ data: null }),
      isOpenPool && isQuoteJob
        ? supabase
            .from("quotes")
            .select("status, proposed_by, amount_cents, note")
            .eq("job_id", job.id)
            .eq("guy_id", user!.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  const myThread: OfferThreadData | null = myThreadRows.data
    ? {
        status: myThreadRows.data.status,
        proposedBy: myThreadRows.data.proposed_by as "guy" | "customer",
        amountCents: myThreadRows.data.amount_cents,
        note: myThreadRows.data.note ?? "",
      }
    : null;

  const earningsCents = calculateProviderPayout({
    serviceAmountCents: job.service_amount_cents,
    addonAmountCents: job.addon_amount_cents,
    discountCents: job.discount_cents,
    taxCents: job.tax_cents,
    platformFeeCents: job.platform_fee_cents,
    tipCents: job.tip_cents,
    totalCents: job.total_cents,
    isEstimate: job.services?.pricing_model === "quote" && job.status === "MATCHING",
  });

  const requestFields = (job.services?.request_fields ?? []) as RequestField[];
  const details = job.details as Record<string, unknown>;
  const displayTitle = jobDisplayTitle(job.details, job.services?.name ?? "Service");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <BackLink />

      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-bold text-ink">{displayTitle}</h1>
          <JobStatusBadge status={job.status as JobStatus} />
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
          <MapPin className="h-3.5 w-3.5" />
          {job.city}, {job.state} {job.postal_code}
        </p>
      </div>

      {isMine && addressResult?.line1 && (
        <a
          href={`https://maps.google.com/?q=${encodeURIComponent(
            `${addressResult.line1}${addressResult.line2 ? " " + addressResult.line2 : ""}, ${addressResult.city}, ${addressResult.state} ${addressResult.postal_code}`,
          )}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-between rounded-2xl border border-line bg-paper-raised px-4 py-3 hover:bg-ink/5"
        >
          <div>
            <p className="text-sm font-medium text-ink">
              {addressResult.line1}
              {addressResult.line2 ? `, ${addressResult.line2}` : ""}
            </p>
            <p className="text-sm text-ink-soft">
              {addressResult.city}, {addressResult.state} {addressResult.postal_code}
            </p>
          </div>
          <Navigation className="h-5 w-5 shrink-0 text-brand" />
        </a>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">
            {job.is_asap ? (
              <span className="flex items-center gap-1">
                <Zap className="h-3.5 w-3.5 text-brand" /> ASAP
              </span>
            ) : (
              formatJobDate(job.scheduled_start)
            )}
          </span>
          <span className="font-display text-lg font-bold text-trust-dark">
            {job.services?.pricing_model === "quote" && job.status === "MATCHING"
              ? "Your quote"
              : `You'll earn ${formatCents(earningsCents)}`}
          </span>
        </div>
      </Card>

      {job.description && (
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold text-ink">Job description</h2>
          <p className="whitespace-pre-wrap text-sm text-ink-soft">{job.description}</p>
        </Card>
      )}

      {requestFields.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-ink">Details from the customer</h2>
          <dl className="space-y-2">
            {requestFields.map((field) => {
              const value = details[field.key];
              if (value === undefined || value === null || value === "") return null;
              return (
                <div key={field.key} className="flex justify-between gap-4 text-sm">
                  <dt className="text-ink-soft">{field.label}</dt>
                  <dd className="text-right font-medium text-ink">
                    {Array.isArray(value) ? value.join(", ") : String(value)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </Card>
      )}

      {addonRows && addonRows.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink">
            <Package className="h-4 w-4" /> Add-ons
          </h2>
          <ul className="space-y-1.5">
            {addonRows.map((a) => (
              <li key={a.id} className="flex justify-between text-sm">
                <span className="text-ink-soft">{a.name}</span>
                <span className="font-medium text-ink">{formatCents(a.price_cents)}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isOpenPool && photoRows && photoRows.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">Photos from the customer</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {(photoRows as JobPhotoData[]).filter((p) => isSafeImageUrl(p.url)).map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="relative block aspect-square overflow-hidden rounded-xl border border-line bg-ink/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- job photo host is arbitrary storage, not known at build time */}
                <img src={p.url} alt="Job photo" className="h-full w-full object-cover" />
              </a>
            ))}
          </div>
        </Card>
      )}

      {isOpenPool && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-ink">
            {isQuoteJob ? "Your offer" : "Ready to take this job?"}
          </h2>
          {isQuoteJob ? <OfferThreadPanel jobId={job.id} thread={myThread} /> : <AcceptJobButton jobId={job.id} />}
        </Card>
      )}

      {isMine && (
        <>
          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Update status</h2>
            <JobStatusActions jobId={job.id} status={job.status as JobStatus} />
            {job.status === "QUOTED" && (
              <p className="text-sm text-ink-soft">Waiting on the customer to accept your quote.</p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Photos</h2>
            <PhotoUploader jobId={job.id} photos={(photoRows as JobPhotoData[] | null) ?? []} />
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Messages</h2>
            <MessageThread
              jobId={job.id}
              messages={(messageRows as ThreadMessage[] | null) ?? []}
              currentUserId={user!.id}
            />
          </Card>

          {REVIEWABLE_STATUSES.includes(job.status as JobStatus) && (
            <Card className="p-4">
              <h2 className="mb-3 text-sm font-semibold text-ink">Rate this customer</h2>
              {existingReview ? (
                <p className="text-sm text-trust-dark">You already reviewed this job. Thanks!</p>
              ) : (
                <ReviewForm jobId={job.id} />
              )}
            </Card>
          )}
        </>
      )}

      {!isMine && !isOpenPool && (
        <p className="text-center text-sm text-ink-soft">
          Status: {JOB_STATUS_LABELS[job.status as JobStatus]}
        </p>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/guy/jobs" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
      <ArrowLeft className="h-4 w-4" />
      Back to jobs
    </Link>
  );
}

/**
 * Fetches the full street address for a job assigned to the calling Guy.
 * The `addresses` table's RLS only grants the address owner (the customer)
 * or an admin — there's no assigned-guy carve-out — so a narrowly-scoped
 * admin-client read is used here, gated strictly on the caller already
 * being the job's assigned Guy (verified via the RLS-respecting `jobs`
 * query above before this is ever called).
 */
async function fetchAddressForAssignedGuy(addressId: string, jobId: string, guyId: string) {
  try {
    const admin = createAdminClient();
    const { data: job } = await admin.from("jobs").select("guy_id").eq("id", jobId).single();
    if (job?.guy_id !== guyId) return null;
    const { data } = await admin.from("addresses").select("*").eq("id", addressId).maybeSingle();
    return data;
  } catch {
    // Supabase not configured (service role key missing) — degrade gracefully.
    return null;
  }
}
