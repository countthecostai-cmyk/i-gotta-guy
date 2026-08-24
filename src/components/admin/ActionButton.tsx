"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Fire-and-confirm button for admin mutations that take no extra input
 * (approve, reinstate, dismiss, etc). Calls a server action, surfaces
 * ActionError messages inline, and refreshes the route on success.
 */
export function ActionButton({
  action,
  children,
  variant,
  size = "sm",
  confirmMessage,
  className,
  onSuccess,
}: {
  action: () => Promise<unknown>;
  children: React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  confirmMessage?: string;
  className?: string;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);

  function handleClick() {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      try {
        await action();
        onSuccess?.();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={pending}
        onClick={handleClick}
      >
        {pending ? "Working…" : children}
      </Button>
      {error && <p className="max-w-xs text-xs text-danger">{error}</p>}
    </div>
  );
}
