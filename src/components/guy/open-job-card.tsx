import Link from "next/link";
import { MapPin, Zap } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { jobDisplayTitle } from "@/lib/domain/job-display";
import { calculateProviderPayout } from "@/lib/domain/pricing";
import { formatJobDate } from "./format";
import { AcceptJobButton } from "./accept-job-button";
import { OfferThreadPanel, type OfferThreadData } from "./offer-thread-panel";
import type { GuyJobWithService } from "./types";

export function OpenJobCard({
  job,
  myThread = null,
  isMatch = false,
}: {
  job: GuyJobWithService;
  myThread?: OfferThreadData | null;
  /** True when this job's service is one the Guy has toggled on in their
   * profile. Every approved Guy sees every open job — this only affects
   * sort order and this small badge, never visibility. */
  isMatch?: boolean;
}) {
  const isQuote = job.services?.pricing_model === "quote";
  const earningsCents = calculateProviderPayout({
    serviceAmountCents: job.service_amount_cents,
    addonAmountCents: job.addon_amount_cents,
    discountCents: job.discount_cents,
    taxCents: job.tax_cents,
    platformFeeCents: job.platform_fee_cents,
    tipCents: job.tip_cents,
    totalCents: job.total_cents,
    isEstimate: isQuote,
  });

  return (
    <Card className="p-4">
      <Link href={`/guy/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-base font-semibold text-ink">
                {jobDisplayTitle(job.details, job.services?.name ?? "Service")}
              </p>
              {isMatch && (
                <span className="shrink-0 rounded-full bg-brand-light px-2 py-0.5 text-[11px] font-medium text-brand-dark">
                  Your service
                </span>
              )}
            </div>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {job.city}, {job.state} {job.postal_code}
              </span>
            </p>
          </div>
          {!isQuote && (
            <div className="shrink-0 text-right">
              <p className="font-display text-base font-bold text-trust-dark">{formatCents(earningsCents)}</p>
              <p className="text-[11px] text-ink-soft">you&apos;d earn</p>
            </div>
          )}
        </div>
        {job.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{job.description}</p>}
        <div className="mt-3 flex items-center gap-1 text-sm text-ink-soft">
          {job.is_asap && <Zap className="h-3.5 w-3.5 text-brand" />}
          {job.is_asap ? "ASAP" : formatJobDate(job.scheduled_start)}
        </div>
      </Link>

      <div className="mt-3">
        {isQuote ? <OfferThreadPanel jobId={job.id} thread={myThread} /> : <AcceptJobButton jobId={job.id} />}
      </div>
    </Card>
  );
}
