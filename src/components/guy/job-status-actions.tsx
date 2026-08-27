"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateJobStatus, cancelJob } from "@/lib/actions/jobs";
import { assertTransition, getValidNextStatuses, type JobStatus } from "@/lib/domain/job-state-machine";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/primitives";

const FORWARD_LABELS: Partial<Record<JobStatus, string>> = {
  SCHEDULED: "Confirm scheduled time",
  EN_ROUTE: "I'm on my way",
  ARRIVED: "I've arrived",
  IN_PROGRESS: "Start the job",
  COMPLETED: "Mark job complete",
};

/** Which of the structurally-valid next statuses a Guy is actually permitted to trigger. */
function guyAllowedNext(current: JobStatus): JobStatus[] {
  return getValidNextStatuses(current).filter((next) => {
    try {
      assertTransition(current, next, "guy");
      return true;
    } catch {
      return false;
    }
  });
}

export function JobStatusActions({
  jobId,
  status,
  hasAfterPhoto = false,
}: {
  jobId: string;
  status: JobStatus;
  /** Whether an "after" photo has been uploaded yet. A job can't be marked
   * COMPLETED without one — enforced server-side in updateJobStatus; this
   * just disables the button early with an explanation instead of letting
   * the Guy hit the error. */
  hasAfterPhoto?: boolean;
}) {
  const router = useRouter();
  const [showCancel, setShowCancel] = useState(false);
  const [reason, setReason] = useState("");
  const updateAction = useServerAction(updateJobStatus);
  const cancelAction = useServerAction(cancelJob);

  const nextOptions = guyAllowedNext(status);
  const forward = nextOptions.filter((s): s is keyof typeof FORWARD_LABELS => s in FORWARD_LABELS);
  const canCancel = nextOptions.includes("CANCELLED");

  if (forward.length === 0 && !canCancel) return null;

  async function handleAdvance(next: JobStatus) {
    const result = await updateAction.run(jobId, next);
    if (result) router.refresh();
  }

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    const result = await cancelAction.run(jobId, reason);
    if (result) router.refresh();
  }

  return (
    <div className="space-y-3">
      <ErrorBanner message={updateAction.error ?? cancelAction.error} />
      {forward.map((next) => {
        const blockedByPhoto = next === "COMPLETED" && !hasAfterPhoto;
        return (
          <div key={next}>
            <Button
              type="button"
              variant="trust"
              size="lg"
              className="w-full"
              disabled={updateAction.pending || blockedByPhoto}
              onClick={() => handleAdvance(next)}
            >
              {updateAction.pending ? "Updating…" : FORWARD_LABELS[next]}
            </Button>
            {blockedByPhoto && (
              <p className="mt-1.5 text-center text-xs text-ink-soft">
                Add a photo of the finished job below before marking it complete.
              </p>
            )}
          </div>
        );
      })}
      {canCancel &&
        (showCancel ? (
          <form
            onSubmit={handleCancel}
            className="space-y-2 rounded-xl border border-danger-light bg-danger-light/40 p-3"
          >
            <Textarea
              rows={2}
              placeholder="Why are you cancelling?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <Button type="submit" variant="danger" size="sm" disabled={cancelAction.pending}>
                {cancelAction.pending ? "Cancelling…" : "Confirm cancel"}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowCancel(false)}>
                Never mind
              </Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCancel(true)}
            className="w-full text-center text-sm font-medium text-danger hover:underline"
          >
            Cancel this job
          </button>
        ))}
    </div>
  );
}
