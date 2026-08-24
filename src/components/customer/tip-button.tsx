"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Input } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/domain/money";
import { addTip } from "@/lib/actions/jobs";
import { ActionError } from "@/lib/actions/errors";

const PRESETS_CENTS = [500, 1000, 2000];

export function TipButton({ jobId, alreadyTippedCents }: { jobId: string; alreadyTippedCents: number }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [customDollars, setCustomDollars] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const amountCents = customDollars ? Math.round(Number(customDollars) * 100) : selected;

  async function handleTip() {
    if (submitting) return;
    if (!amountCents || amountCents <= 0) {
      setError("Choose or enter a tip amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await addTip({ jobId, amountCents });
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      setDone(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't process the tip. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <Card className="flex items-center gap-2 p-4 text-trust-dark">
        <HandCoins className="h-5 w-5" />
        <p className="text-sm font-medium">Tip sent — thank you!</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="font-display text-sm font-semibold text-ink">
        {alreadyTippedCents > 0 ? `You've tipped ${formatCents(alreadyTippedCents)}. Add more?` : "Tip your Guy"}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS_CENTS.map((cents) => (
          <button
            key={cents}
            type="button"
            onClick={() => {
              setSelected(cents);
              setCustomDollars("");
            }}
            className={cn(
              "tap-target rounded-full border px-4 py-2 text-sm font-medium",
              selected === cents && !customDollars
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-line text-ink hover:bg-ink/5",
            )}
          >
            {formatCents(cents, { showCents: false })}
          </button>
        ))}
        <Input
          type="number"
          min={0}
          inputMode="decimal"
          placeholder="Custom $"
          value={customDollars}
          onChange={(e) => {
            setCustomDollars(e.target.value);
            setSelected(null);
          }}
          className="w-28"
        />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <Button className="mt-3" onClick={handleTip} disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send tip"}
      </Button>
    </Card>
  );
}
