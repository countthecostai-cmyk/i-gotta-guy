"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitQuote } from "@/lib/actions/jobs";
import { toCents } from "@/lib/domain/money";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";

export function QuoteForm({ jobId, onCancel }: { jobId: string; onCancel?: () => void }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const { run, pending, error } = useServerAction(submitQuote);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(amount);
    if (!dollars || dollars <= 0) return;
    const result = await run({ jobId, amountCents: toCents(dollars), note });
    if (result) router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-line bg-paper p-3">
      <ErrorBanner message={error} />
      <div>
        <Label htmlFor={`quote-amount-${jobId}`}>Your price</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">$</span>
          <Input
            id={`quote-amount-${jobId}`}
            type="number"
            min={1}
            step="0.01"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="pl-7"
            required
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`quote-note-${jobId}`}>Note to customer (optional)</Label>
        <Textarea
          id={`quote-note-${jobId}`}
          rows={2}
          maxLength={1000}
          placeholder="e.g. Includes materials, available this weekend"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" variant="trust" size="sm" disabled={pending} className="flex-1">
          {pending ? "Sending…" : "Send quote"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
