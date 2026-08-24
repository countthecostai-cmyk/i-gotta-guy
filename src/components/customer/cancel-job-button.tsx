"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/primitives";
import { cancelJob } from "@/lib/actions/jobs";
import { ActionError } from "@/lib/actions/errors";

export function CancelJobButton({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    try {
      await cancelJob(jobId, reason.trim());
      router.refresh();
      setOpen(false);
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't cancel this job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-danger hover:bg-danger-light">
        <X className="h-4 w-4" />
        Cancel job
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-danger-light bg-danger-light/30 p-4">
      <Label htmlFor="cancel-reason">Why are you cancelling?</Label>
      <Textarea
        id="cancel-reason"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Optional, but it helps us improve."
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button variant="danger" size="sm" onClick={handleCancel} disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm cancellation"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={submitting}>
          Never mind
        </Button>
      </div>
    </div>
  );
}
