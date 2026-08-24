import { Badge } from "@/components/ui/primitives";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";

const VARIANT_BY_STATUS: Record<JobStatus, "default" | "trust" | "brand" | "warn" | "danger" | "muted"> = {
  REQUESTED: "muted",
  MATCHING: "brand",
  QUOTED: "brand",
  ACCEPTED: "brand",
  SCHEDULED: "brand",
  EN_ROUTE: "warn",
  ARRIVED: "warn",
  IN_PROGRESS: "warn",
  COMPLETED: "trust",
  CANCELLED: "muted",
  DECLINED: "muted",
  EXPIRED: "muted",
  DISPUTED: "danger",
  REFUNDED: "muted",
  PAYOUT_PENDING: "trust",
  PAYOUT_COMPLETED: "trust",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={VARIANT_BY_STATUS[status]}>{JOB_STATUS_LABELS[status]}</Badge>;
}
