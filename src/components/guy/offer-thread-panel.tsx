"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitQuote, withdrawOffer, guyDeclineOffer } from "@/lib/actions/jobs";
import { formatCents, toCents } from "@/lib/domain/money";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { QuoteForm } from "./quote-form";

export interface OfferThreadData {
  status: string;
  proposedBy: "guy" | "customer";
  amountCents: number;
  note: string;
}

/**
 * Renders this Guy's negotiation state on one job: their own live offer
 * thread (if any) and the actions available to them right now. Reused on
 * the job detail page and in the "My offers" list.
 */
export function OfferThreadPanel({ jobId, thread }: { jobId: string; thread: OfferThreadData | null }) {
  if (!thread || thread.status === "declined" || thread.status === "withdrawn") {
    return <ReofferPanel jobId={jobId} priorThread={thread} />;
  }
  if (thread.status === "pending" && thread.proposedBy === "guy") {
    return <AwaitingCustomerPanel jobId={jobId} thread={thread} />;
  }
  if (thread.status === "pending" && thread.proposedBy === "customer") {
    return <RespondToCounterPanel jobId={jobId} thread={thread} />;
  }
  return null;
}

function ReofferPanel({ jobId, priorThread }: { jobId: string; priorThread: OfferThreadData | null }) {
  const [showForm, setShowForm] = useState(false);
  if (showForm) return <QuoteForm jobId={jobId} onCancel={() => setShowForm(false)} />;
  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      {priorThread && (
        <p className="text-sm text-ink-soft">
          {priorThread.status === "withdrawn" ? "You withdrew your offer" : "Your last offer was declined"}
          {priorThread.amountCents ? ` (${formatCents(priorThread.amountCents)})` : ""}.
        </p>
      )}
      <Button size="sm" variant="trust" className="mt-2 w-full" onClick={() => setShowForm(true)}>
        Send a new offer
      </Button>
    </div>
  );
}

function AwaitingCustomerPanel({ jobId, thread }: { jobId: string; thread: OfferThreadData }) {
  const router = useRouter();
  const { run, pending, error } = useServerAction(withdrawOffer);

  async function handleWithdraw() {
    const result = await run({ jobId });
    if (result) router.refresh();
  }

  return (
    <div className="rounded-xl border border-line bg-paper p-3">
      <ErrorBanner message={error} />
      <p className="text-sm text-ink">
        Your offer of <span className="font-semibold">{formatCents(thread.amountCents)}</span> is awaiting the customer&apos;s
        response.
      </p>
      {thread.note && <p className="mt-1 text-sm text-ink-soft">{thread.note}</p>}
      <Button size="sm" variant="ghost" className="mt-2" onClick={handleWithdraw} disabled={pending}>
        {pending ? "Withdrawing…" : "Withdraw offer"}
      </Button>
    </div>
  );
}

function RespondToCounterPanel({ jobId, thread }: { jobId: string; thread: OfferThreadData }) {
  const router = useRouter();
  const [showCounter, setShowCounter] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const counterAction = useServerAction(submitQuote);
  const declineAction = useServerAction(guyDeclineOffer);

  async function handleCounter(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(amount);
    if (!dollars || dollars <= 0) return;
    const result = await counterAction.run({ jobId, amountCents: toCents(dollars), note });
    if (result) router.refresh();
  }

  async function handleAccept() {
    // Guy "accepts" the customer's counter by matching it — the customer
    // still finalizes the job by hitting Accept on their side, keeping
    // "customer chooses one" the single source of truth for who wins.
    const result = await counterAction.run({ jobId, amountCents: thread.amountCents, note: "Accepted your price." });
    if (result) router.refresh();
  }

  async function handleDecline() {
    const result = await declineAction.run({ jobId });
    if (result) router.refresh();
  }

  return (
    <div className="rounded-xl border border-brand/40 bg-brand-light/30 p-3">
      <ErrorBanner message={counterAction.error ?? declineAction.error} />
      <p className="text-sm text-ink">
        The customer countered with <span className="font-semibold">{formatCents(thread.amountCents)}</span>.
      </p>
      {thread.note && <p className="mt-1 text-sm text-ink-soft">{thread.note}</p>}

      {showCounter ? (
        <form onSubmit={handleCounter} className="mt-3 space-y-2">
          <div>
            <Label htmlFor={`respond-amount-${jobId}`}>Your counter-price</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">$</span>
              <Input
                id={`respond-amount-${jobId}`}
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
            <Label htmlFor={`respond-note-${jobId}`}>Note (optional)</Label>
            <Textarea id={`respond-note-${jobId}`} rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="trust" disabled={counterAction.pending} className="flex-1">
              {counterAction.pending ? "Sending…" : "Send counter-offer"}
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={counterAction.pending} onClick={() => setShowCounter(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="sm" variant="trust" className="flex-1" onClick={handleAccept} disabled={counterAction.pending || declineAction.pending}>
            {counterAction.pending ? "Sending…" : `Accept ${formatCents(thread.amountCents)}`}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCounter(true)} disabled={counterAction.pending || declineAction.pending}>
            Counter
          </Button>
          <Button size="sm" variant="outline" onClick={handleDecline} disabled={counterAction.pending || declineAction.pending}>
            {declineAction.pending ? "Declining…" : "Decline"}
          </Button>
        </div>
      )}
    </div>
  );
}
