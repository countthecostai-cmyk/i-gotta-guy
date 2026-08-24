import { formatCents } from "@/lib/domain/money";

export interface PriceBreakdownLine {
  label: string;
  cents: number;
  /** Render as a negative/subtracted line (e.g. discounts). */
  isSubtraction?: boolean;
  muted?: boolean;
}

export function PriceBreakdown({
  lines,
  totalCents,
  totalLabel = "Total",
  isEstimate = false,
  className,
}: {
  lines: PriceBreakdownLine[];
  totalCents: number;
  totalLabel?: string;
  isEstimate?: boolean;
  className?: string;
}) {
  const visibleLines = lines.filter((l) => l.cents !== 0 || !l.muted);
  return (
    <div className={className}>
      <div className="space-y-2 text-sm">
        {visibleLines.map((line) => (
          <div key={line.label} className="flex items-center justify-between text-ink-soft">
            <span>{line.label}</span>
            <span className={line.isSubtraction ? "text-trust" : "text-ink"}>
              {line.isSubtraction && line.cents > 0 ? "−" : ""}
              {formatCents(line.cents)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
        <span className="font-display text-base font-semibold text-ink">
          {isEstimate ? `Estimated ${totalLabel.toLowerCase()}` : totalLabel}
        </span>
        <span className="font-display text-lg font-bold text-ink">{formatCents(totalCents)}</span>
      </div>
      {isEstimate && (
        <p className="mt-1 text-xs text-ink-soft">
          This is an estimate. Your Guy will send a final price before you pay.
        </p>
      )}
    </div>
  );
}
