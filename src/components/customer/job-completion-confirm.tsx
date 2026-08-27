"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { Textarea, Label } from "@/components/ui/primitives";
import { confirmJobCompletion, reportCompletionProblem } from "@/lib/actions/jobs";
import { ActionError } from "@/lib/actions/errors";

/**
 * Shown on a COMPLETED job. The Guy doesn't get paid on their own say-so —
 * the customer must either confirm the work is done (which triggers
 * payout) or flag a problem (which sends the job to DISPUTED for our team
 * to review, instead of leaving it stuck unpaid with no recourse).
 */
export function JobCompletionConfirm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "reporting">("idle");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await confirmJobCompletion(jobId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't confirm this job. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport() {
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await reportCompletionProblem(jobId, reason.trim());
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't submit this report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="space-y-3 border-trust-light bg-trust-light/20 p-4">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-trust-dark" />
        <div>
          <h2 className="font-display text-sm font-semibold text-ink">Is the job done?</h2>
          <p className="mt-0.5 text-sm text-ink-soft">
            Take a look at the photos above. Confirming pays your Guy — only do this once the work is actually
            finished.
          </p>
        </div>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}

      {mode === "idle" ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="trust" size="lg" onClick={handleConfirm} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm — the job is done"}
          </Button>
          <Button variant="outline" size="lg" onClick={() => setMode("reporting")} disabled={submitting}>
            Something&apos;s not right
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="completion-problem">What went wrong?</Label>
          <Textarea
            id="completion-problem"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Tell us what's incomplete or wrong so our team can take a look."
          />
          <div className="flex gap-2">
            <Button variant="danger" size="sm" onClick={handleReport} disabled={submitting || !reason.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMode("idle")} disabled={submitting}>
              Never mind
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
