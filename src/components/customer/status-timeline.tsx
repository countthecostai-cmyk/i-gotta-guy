import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { JOB_STATUS_LABELS, type JobStatus } from "@/lib/domain/job-state-machine";
import { formatRelativeTime } from "./format";

export interface StatusHistoryEntry {
  id: string;
  status: JobStatus;
  note: string | null;
  created_at: string;
}

const TERMINAL_NEGATIVE: JobStatus[] = ["CANCELLED", "DECLINED", "EXPIRED", "REFUNDED"];

export function StatusTimeline({ history, currentStatus }: { history: StatusHistoryEntry[]; currentStatus: JobStatus }) {
  const isNegative = TERMINAL_NEGATIVE.includes(currentStatus);

  return (
    <ol className="space-y-0">
      {history.map((entry, idx) => {
        const isLast = idx === history.length - 1;
        const negative = TERMINAL_NEGATIVE.includes(entry.status);
        return (
          <li key={entry.id} className="relative flex gap-3 pb-6 last:pb-0">
            {!isLast && (
              <span className="absolute left-[11px] top-6 h-full w-px bg-line" aria-hidden="true" />
            )}
            <span
              className={cn(
                "z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                negative ? "bg-danger-light text-danger" : isLast && !isNegative
                  ? "bg-trust text-white"
                  : "bg-trust-light text-trust",
              )}
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <div className="pt-0.5">
              <p className="text-sm font-medium text-ink">{JOB_STATUS_LABELS[entry.status]}</p>
              {entry.note && <p className="mt-0.5 text-sm text-ink-soft">{entry.note}</p>}
              <p className="mt-0.5 text-xs text-ink-soft/70">{formatRelativeTime(entry.created_at)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
