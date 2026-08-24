import { ACTIVE_JOB_STATUSES, type JobStatus } from "@/lib/domain/job-state-machine";

/** Statuses that still need the customer's attention / are in flight. */
export const IN_FLIGHT_STATUSES: JobStatus[] = [
  "REQUESTED",
  "MATCHING",
  "QUOTED",
  "DISPUTED",
  ...ACTIVE_JOB_STATUSES,
];

export function isInFlight(status: JobStatus): boolean {
  return IN_FLIGHT_STATUSES.includes(status);
}
