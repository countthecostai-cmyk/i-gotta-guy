/**
 * Job lifecycle state machine. Job status must NEVER be set directly —
 * always go through `assertTransition` / `getValidNextStatuses` so the
 * business process stays meaningful and auditable (see job_status_history).
 */

export type JobStatus =
  | "REQUESTED"
  | "MATCHING"
  | "QUOTED"
  | "ACCEPTED"
  | "SCHEDULED"
  | "EN_ROUTE"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED"
  | "DECLINED"
  | "EXPIRED"
  | "DISPUTED"
  | "REFUNDED"
  | "PAYOUT_PENDING"
  | "PAYOUT_COMPLETED";

export type JobActor = "customer" | "guy" | "admin" | "system";

const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  REQUESTED: ["MATCHING", "CANCELLED"],
  MATCHING: ["QUOTED", "ACCEPTED", "EXPIRED", "CANCELLED"],
  QUOTED: ["ACCEPTED", "DECLINED", "EXPIRED", "CANCELLED"],
  ACCEPTED: ["SCHEDULED", "CANCELLED", "DISPUTED"],
  SCHEDULED: ["EN_ROUTE", "CANCELLED", "DISPUTED"],
  EN_ROUTE: ["ARRIVED", "CANCELLED", "DISPUTED"],
  ARRIVED: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  IN_PROGRESS: ["COMPLETED", "DISPUTED", "CANCELLED"],
  COMPLETED: ["PAYOUT_PENDING", "DISPUTED", "REFUNDED"],
  PAYOUT_PENDING: ["PAYOUT_COMPLETED", "DISPUTED"],
  PAYOUT_COMPLETED: [],
  CANCELLED: ["REFUNDED"],
  DECLINED: ["MATCHING"],
  EXPIRED: ["MATCHING"],
  DISPUTED: ["REFUNDED", "COMPLETED", "CANCELLED"],
  REFUNDED: [],
};

// Which actor is allowed to *initiate* each transition. Admin can always do
// anything (enforced separately) — this map is for customer/guy/system.
const TRANSITION_ACTORS: Record<string, JobActor[]> = {
  "REQUESTED->MATCHING": ["system"],
  "REQUESTED->CANCELLED": ["customer", "admin"],
  "MATCHING->QUOTED": ["guy"],
  // "guy" covers the legacy single-offer flow (acceptOpenJob, fixed-price
  // jobs). "customer" covers the multi-offer negotiation flow, where the
  // customer accepts one Guy's current offer directly from MATCHING
  // (jobs never pass through QUOTED while multiple offers are live).
  "MATCHING->ACCEPTED": ["guy", "customer"],
  "MATCHING->EXPIRED": ["system"],
  "MATCHING->CANCELLED": ["customer", "admin"],
  "QUOTED->ACCEPTED": ["customer"],
  "QUOTED->DECLINED": ["customer"],
  "QUOTED->EXPIRED": ["system"],
  "QUOTED->CANCELLED": ["customer", "admin"],
  "ACCEPTED->SCHEDULED": ["guy", "system"],
  "ACCEPTED->CANCELLED": ["customer", "guy", "admin"],
  "SCHEDULED->EN_ROUTE": ["guy"],
  "SCHEDULED->CANCELLED": ["customer", "guy", "admin"],
  "EN_ROUTE->ARRIVED": ["guy"],
  "EN_ROUTE->CANCELLED": ["customer", "guy", "admin"],
  "ARRIVED->IN_PROGRESS": ["guy"],
  "ARRIVED->CANCELLED": ["customer", "guy", "admin"],
  "IN_PROGRESS->COMPLETED": ["guy"],
  "IN_PROGRESS->CANCELLED": ["admin"],
  "COMPLETED->PAYOUT_PENDING": ["system"],
  "PAYOUT_PENDING->PAYOUT_COMPLETED": ["system"],
  "DECLINED->MATCHING": ["system"],
  "EXPIRED->MATCHING": ["system"],
  "CANCELLED->REFUNDED": ["system"],
  "COMPLETED->REFUNDED": ["admin", "system"],
};

export const TERMINAL_STATUSES: JobStatus[] = [
  "PAYOUT_COMPLETED",
  "REFUNDED",
  "DECLINED",
  "EXPIRED",
];

export const ACTIVE_JOB_STATUSES: JobStatus[] = [
  "ACCEPTED",
  "SCHEDULED",
  "EN_ROUTE",
  "ARRIVED",
  "IN_PROGRESS",
];

export function getValidNextStatuses(current: JobStatus): JobStatus[] {
  return TRANSITIONS[current] ?? [];
}

export function canTransition(from: JobStatus, to: JobStatus): boolean {
  return getValidNextStatuses(from).includes(to);
}

export class InvalidJobTransitionError extends Error {
  constructor(from: JobStatus, to: JobStatus) {
    super(`Cannot transition job from ${from} to ${to}`);
    this.name = "InvalidJobTransitionError";
  }
}

/**
 * Throws if the transition is not structurally valid or not permitted for
 * the given actor. Admins bypass the actor check (but not the structural
 * state-machine check — admins still can't skip states arbitrarily, except
 * via the explicitly-modeled dispute/refund paths).
 */
export function assertTransition(from: JobStatus, to: JobStatus, actor: JobActor): void {
  if (!canTransition(from, to)) {
    throw new InvalidJobTransitionError(from, to);
  }
  if (actor === "admin") return;
  const allowedActors = TRANSITION_ACTORS[`${from}->${to}`] ?? [];
  if (!allowedActors.includes(actor)) {
    throw new Error(`Actor "${actor}" is not permitted to move a job from ${from} to ${to}`);
  }
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  REQUESTED: "Requested",
  MATCHING: "Finding a Guy",
  QUOTED: "Quote received",
  ACCEPTED: "Guy assigned",
  SCHEDULED: "Scheduled",
  EN_ROUTE: "Guy is on the way",
  ARRIVED: "Guy has arrived",
  IN_PROGRESS: "Job in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  DISPUTED: "Under review",
  REFUNDED: "Refunded",
  PAYOUT_PENDING: "Payout pending",
  PAYOUT_COMPLETED: "Paid out",
};
