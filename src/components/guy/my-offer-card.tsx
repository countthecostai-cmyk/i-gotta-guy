import Link from "next/link";
import { MapPin, Zap } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { formatJobDate } from "./format";
import { OfferThreadPanel, type OfferThreadData } from "./offer-thread-panel";

export interface MyOfferJobSummary {
  id: string;
  serviceName: string;
  city: string;
  state: string;
  postalCode: string;
  description: string;
  isAsap: boolean;
  scheduledStart: string | null;
}

/** One of the current Guy's live offer threads, shown in "My offers" — mirrors the job-detail page's offer panel but with the job summary attached. */
export function MyOfferCard({ job, thread }: { job: MyOfferJobSummary; thread: OfferThreadData }) {
  return (
    <Card className="p-4">
      <Link href={`/guy/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">{job.serviceName}</p>
            <p className="mt-0.5 flex items-center gap-1 text-sm text-ink-soft">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {job.city}, {job.state} {job.postalCode}
              </span>
            </p>
          </div>
        </div>
        {job.description && <p className="mt-2 line-clamp-2 text-sm text-ink-soft">{job.description}</p>}
        <div className="mt-3 flex items-center gap-1 text-sm text-ink-soft">
          {job.isAsap && <Zap className="h-3.5 w-3.5 text-brand" />}
          {job.isAsap ? "ASAP" : formatJobDate(job.scheduledStart)}
        </div>
      </Link>
      <div className="mt-3">
        <OfferThreadPanel jobId={job.id} thread={thread} />
      </div>
    </Card>
  );
}
