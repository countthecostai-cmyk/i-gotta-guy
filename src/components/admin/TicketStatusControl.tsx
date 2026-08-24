"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { updateSupportTicket } from "@/lib/actions/admin";
import { Select } from "@/components/ui/primitives";

const STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
type Status = (typeof STATUSES)[number];

export function TicketStatusControl({ ticketId, status }: { ticketId: string; status: Status }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [value, setValue] = React.useState<Status>(status);

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Status;
    setValue(next);
    setError(null);
    startTransition(async () => {
      try {
        await updateSupportTicket(ticketId, next);
        router.refresh();
      } catch (err) {
        setValue(status);
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="w-40">
      <Select value={value} onChange={onChange} disabled={pending} className="text-xs">
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, " ")}
          </option>
        ))}
      </Select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
