import { Badge } from "@/components/ui/primitives";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";
import type { GuyStatus, PaymentStatus, PayoutStatus } from "@/types/database";

type BadgeVariant = "default" | "trust" | "brand" | "warn" | "danger" | "muted";

const JOB_STATUS_TONE: Record<JobStatus, BadgeVariant> = {
  REQUESTED: "muted",
  MATCHING: "brand",
  QUOTED: "brand",
  ACCEPTED: "brand",
  SCHEDULED: "brand",
  EN_ROUTE: "brand",
  ARRIVED: "brand",
  IN_PROGRESS: "brand",
  COMPLETED: "trust",
  CANCELLED: "muted",
  DECLINED: "muted",
  EXPIRED: "muted",
  DISPUTED: "danger",
  REFUNDED: "warn",
  PAYOUT_PENDING: "warn",
  PAYOUT_COMPLETED: "trust",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <Badge variant={JOB_STATUS_TONE[status] ?? "default"}>{JOB_STATUS_LABELS[status] ?? status}</Badge>;
}

const GUY_STATUS_TONE: Record<GuyStatus, BadgeVariant> = {
  pending: "warn",
  approved: "trust",
  rejected: "muted",
  suspended: "danger",
};

const GUY_STATUS_LABELS: Record<GuyStatus, string> = {
  pending: "Pending review",
  approved: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export function GuyStatusBadge({ status }: { status: GuyStatus }) {
  return <Badge variant={GUY_STATUS_TONE[status] ?? "default"}>{GUY_STATUS_LABELS[status] ?? status}</Badge>;
}

const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeVariant> = {
  pending: "warn",
  succeeded: "trust",
  failed: "danger",
  refunded: "muted",
  partially_refunded: "warn",
  refund_pending: "warn",
};

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return <Badge variant={PAYMENT_STATUS_TONE[status] ?? "default"}>{status.replace(/_/g, " ")}</Badge>;
}

const PAYOUT_STATUS_TONE: Record<PayoutStatus, BadgeVariant> = {
  pending: "warn",
  in_transit: "brand",
  paid: "trust",
  failed: "danger",
};

export function PayoutStatusBadge({ status }: { status: PayoutStatus }) {
  return <Badge variant={PAYOUT_STATUS_TONE[status] ?? "default"}>{status.replace(/_/g, " ")}</Badge>;
}

const TICKET_STATUS_TONE: Record<string, BadgeVariant> = {
  open: "warn",
  in_progress: "brand",
  resolved: "trust",
  closed: "muted",
};

export function TicketStatusBadge({ status }: { status: string }) {
  return <Badge variant={TICKET_STATUS_TONE[status] ?? "default"}>{status.replace(/_/g, " ")}</Badge>;
}
