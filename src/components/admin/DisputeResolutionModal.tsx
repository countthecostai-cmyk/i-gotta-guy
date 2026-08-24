"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { resolveDispute } from "@/lib/actions/admin";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/primitives";
import { Modal } from "./Modal";

type Action = "refund" | "release" | "dismiss";

const ACTION_COPY: Record<Action, { label: string; description: string }> = {
  refund: { label: "Refund customer", description: "Refunds the customer's payment in full and marks the job REFUNDED." },
  release: { label: "Release funds to Guy", description: "Marks the job COMPLETED so payout proceeds normally." },
  dismiss: { label: "Dismiss dispute", description: "Logs a resolution note without changing payment or job outcome." },
};

export function DisputeResolutionModal({
  jobId,
  triggerLabel = "Resolve dispute",
  triggerVariant = "primary",
  triggerSize = "sm",
}: {
  jobId: string;
  triggerLabel?: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [action, setAction] = React.useState<Action>("refund");
  const [resolution, setResolution] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (!resolution.trim()) {
      setError("Add a resolution note for the audit trail.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await resolveDispute(jobId, resolution.trim(), action);
        setOpen(false);
        setResolution("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Resolve dispute">
        <div className="space-y-4">
          <div className="space-y-2">
            {(Object.keys(ACTION_COPY) as Action[]).map((key) => (
              <label
                key={key}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                  action === key ? "border-brand bg-brand-light/40" : "border-line hover:bg-ink/[0.02]"
                }`}
              >
                <input
                  type="radio"
                  name="dispute-action"
                  className="mt-1"
                  checked={action === key}
                  onChange={() => setAction(key)}
                />
                <span>
                  <span className="block text-sm font-medium text-ink">{ACTION_COPY[key].label}</span>
                  <span className="block text-xs text-ink-soft">{ACTION_COPY[key].description}</span>
                </span>
              </label>
            ))}
          </div>
          <div>
            <Label htmlFor="dispute-resolution">Resolution note (required)</Label>
            <Textarea
              id="dispute-resolution"
              rows={3}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="What happened and how it was resolved…"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant={action === "refund" ? "danger" : "primary"}
              size="sm"
              disabled={pending}
              onClick={submit}
            >
              {pending ? "Submitting…" : "Confirm resolution"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
