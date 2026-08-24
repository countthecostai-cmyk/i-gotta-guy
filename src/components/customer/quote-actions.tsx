"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Card, ErrorState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/domain/money";
import { acceptQuote, declineQuote } from "@/lib/actions/jobs";
import { ActionError } from "@/lib/actions/errors";

export function QuoteActions({ jobId, amountCents, note }: { jobId: string; amountCents: number; note: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setBusy("accept");
    setError(null);
    try {
      const result = await acceptQuote(jobId);
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't accept the quote. Please try again.");
      setBusy(null);
    }
  }

  async function handleDecline() {
    setBusy("decline");
    setError(null);
    try {
      await declineQuote(jobId);
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't decline the quote. Please try again.");
      setBusy(null);
    }
  }

  return (
    <Card className="border-brand/40 bg-brand-light/30 p-4">
      <p className="font-display text-sm font-semibold text-ink">You got a quote</p>
      <p className="mt-1 font-display text-2xl font-bold text-ink">{formatCents(amountCents)}</p>
      {note && <p className="mt-1 text-sm text-ink-soft">{note}</p>}
      {error && <ErrorState message={error} />}
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" onClick={handleAccept} disabled={busy !== null}>
          {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept & Pay"}
        </Button>
        <Button variant="outline" className="flex-1" onClick={handleDecline} disabled={busy !== null}>
          {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
        </Button>
      </div>
    </Card>
  );
}
