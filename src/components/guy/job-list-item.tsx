import Link from "next/link";
import { ChevronRight, MapPin, Zap } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { jobDisplayTitle } from "@/lib/domain/job-display";
import { calculateProviderPayout } from "@/lib/domain/pricing";
import type { JobStatus } from "@/lib/domain/job-state-machine";
import { JobStatusBadge } from "./job-status-badge";
import { formatJobDate } from "./format";
import type { GuyJobWithService } from "./types";

export function JobListItem({ job }: { job: GuyJobWithService }) {
  const earningsCents =
    job.status === "MATCHING"
      ? calculateProviderPayout({
          serviceAmountCents: job.service_amount_cents,
          addonAmountCents: job.addon_amount_cents,
          discountCents: job.discount_cents,
          taxCents: job.tax_cents,
          platformFeeCents: job.platform_fee_cents,
          tipCents: job.tip_cents,
          totalCents: job.total_cents,
          isEstimate: job.services?.pricing_model === "quote",
        })
      : calculateProviderPayout({
          serviceAmountCents: job.service_amount_cents,
          addonAmountCents: job.addon_amount_cents,
          discountCents: job.discount_cents,
          taxCents: job.tax_cents,
          platformFeeCents: job.platform_fee_cents,
          tipCents: job.tip_cents,
          totalCents: job.total_cents,
          isEstimate: false,
        });

  return (
    <Link href={`/guy/jobs/${job.id}`} className="block">
      <Card className="p-4 transition-colors hover:border-brand/40">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">
              {jobDisplayTitle(job.details, job.services?.name ?? "Service")}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {job.city}, {job.state}
              </span>
            </p>
          </div>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-ink-soft" />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <JobStatusBadge status={job.status as JobStatus} />
          <span className="flex items-center gap-1 text-sm text-ink-soft">
            {job.is_asap && <Zap className="h-3.5 w-3.5 text-brand" />}
            {job.is_asap ? "ASAP" : formatJobDate(job.scheduled_start)}
          </span>
        </div>
        <div className="mt-2 text-sm font-medium text-trust-dark">
          {job.services?.pricing_model === "quote" && job.status === "MATCHING"
            ? "Send a quote"
            : `You'll earn ${formatCents(earningsCents)}`}
        </div>
      </Card>
    </Link>
  );
}
