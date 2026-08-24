"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Textarea, Label } from "@/components/ui/primitives";
import { Modal } from "./Modal";

/**
 * Opens a small modal collecting a required free-text reason/note, then
 * calls the given server action with it. Used for reject/suspend/refund/
 * dispute-resolution flows that require an audit-trail explanation.
 */
export function ReasonActionButton({
  label,
  title,
  fieldLabel,
  placeholder,
  action,
  variant = "outline",
  confirmVariant = "primary",
  size = "sm",
  requireReason = true,
}: {
  label: string;
  title: string;
  fieldLabel: string;
  placeholder?: string;
  action: (reason: string) => Promise<unknown>;
  variant?: ButtonProps["variant"];
  confirmVariant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  requireReason?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (requireReason && !reason.trim()) {
      setError("Please provide a reason.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await action(reason.trim());
        setOpen(false);
        setReason("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-3">
          <div>
            <Label htmlFor="reason-field">{fieldLabel}</Label>
            <Textarea
              id="reason-field"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={placeholder}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant={confirmVariant} size="sm" disabled={pending} onClick={submit}>
              {pending ? "Submitting…" : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
