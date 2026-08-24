import { Badge } from "@/components/ui/primitives";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";

const VARIANT_BY_STATUS: Record<JobStatus, "default" | "trust" | "brand" | "warn" | "danger" | "muted"> = {
  REQUESTED: "muted",
  MATCHING: "brand",
  QUOTED: "brand",
  ACCEPTED: "trust",
  SCHEDULED: "trust",
  EN_ROUTE: "trust",
  ARRIVED: "trust",
  IN_PROGRESS: "trust",
  COMPLETED: "trust",
  CANCELLED: "muted",
  DECLINED: "muted",
  EXPIRED: "muted",
  DISPUTED: "warn",
  REFUNDED: "muted",
  PAYOUT_PENDING: "trust",
  PAYOUT_COMPLETED: "trust",
};

export function JobStatusBadge({ status, className }: { status: JobStatus; className?: string }) {
  return (
    <Badge variant={VARIANT_BY_STATUS[status]} className={className}>
      {JOB_STATUS_LABELS[status]}
    </Badge>
  );
}
