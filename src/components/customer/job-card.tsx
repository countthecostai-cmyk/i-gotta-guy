import Link from "next/link";
import { MapPin, ChevronRight, Repeat } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import type { JobStatus } from "@/lib/domain/job-state-machine";
import { JobStatusBadge } from "./status-badge";
import { formatJobDate } from "./format";

export interface JobCardData {
  id: string;
  status: JobStatus;
  serviceName: string;
  serviceSlug: string;
  city: string;
  state: string;
  scheduledStart: string | null;
  isAsap: boolean;
  totalCents: number;
  createdAt: string;
}

export function JobCard({ job, showRebook = false }: { job: JobCardData; showRebook?: boolean }) {
  return (
    <Card className="p-4">
      <Link href={`/app/jobs/${job.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold text-ink">{job.serviceName}</p>
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
          <JobStatusBadge status={job.status} />
          <span className="text-sm text-ink-soft">
            {job.isAsap ? "ASAP" : formatJobDate(job.scheduledStart)}
          </span>
        </div>
        <div className="mt-2 text-sm font-medium text-ink">
          {job.totalCents > 0 ? formatCents(job.totalCents) : "Pending quote"}
        </div>
      </Link>
      {showRebook && (
        <Link
          href={`/app/request/${job.serviceSlug}?rebookFrom=${job.id}`}
          className="tap-target mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-full border border-line bg-transparent px-4 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          <Repeat className="h-4 w-4" />
          Book again
        </Link>
      )}
    </Card>
  );
}
