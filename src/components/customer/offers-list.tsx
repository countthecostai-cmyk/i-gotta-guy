"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, Star, User } from "lucide-react";
import { Card, Badge, ErrorState, Input, Label, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatCents, toCents } from "@/lib/domain/money";
import { acceptQuote, customerCounterOffer, declineOffer } from "@/lib/actions/jobs";
import { ActionError } from "@/lib/actions/errors";

export interface OfferData {
  guyId: string;
  fullName: string;
  avatarUrl: string | null;
  avgRating: number | null;
  ratingCount: number;
  completedJobsCount: number;
  identityVerified: boolean;
  backgroundCheckStatus: string;
  amountCents: number;
  note: string;
  proposedBy: "guy" | "customer";
  createdAt: string;
}

/**
 * Shows every Guy's current live offer thread on this job side-by-side so
 * the customer can compare and pick one. Only pending threads are passed
 * in — declined/withdrawn/accepted threads have already resolved.
 */
export function OffersList({ jobId, offers }: { jobId: string; offers: OfferData[] }) {
  if (offers.length === 0) return null;
  const sorted = [...offers].sort((a, b) => a.amountCents - b.amountCents);
  return (
    <section>
      <h2 className="mb-3 font-display text-sm font-semibold text-ink">
        {offers.length === 1 ? "You have an offer" : `Compare ${offers.length} offers`}
      </h2>
      <div className="space-y-3">
        {sorted.map((offer) => (
          <OfferCard key={offer.guyId} jobId={jobId} offer={offer} />
        ))}
      </div>
    </section>
  );
}

function OfferCard({ jobId, offer }: { jobId: string; offer: OfferData }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | "counter" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");
  const [counterNote, setCounterNote] = useState("");

  const isMyTurn = offer.proposedBy === "guy";

  async function handleAccept() {
    setBusy("accept");
    setError(null);
    try {
      const result = await acceptQuote({ jobId, guyId: offer.guyId });
      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't accept this offer. Please try again.");
      setBusy(null);
    }
  }

  async function handleDecline() {
    setBusy("decline");
    setError(null);
    try {
      await declineOffer({ jobId, guyId: offer.guyId });
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't decline this offer. Please try again.");
      setBusy(null);
    }
  }

  async function handleCounter(e: React.FormEvent) {
    e.preventDefault();
    const dollars = Number(counterAmount);
    if (!dollars || dollars <= 0) return;
    setBusy("counter");
    setError(null);
    try {
      await customerCounterOffer({ jobId, guyId: offer.guyId, amountCents: toCents(dollars), note: counterNote });
      setShowCounter(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't send your counter-offer. Please try again.");
      setBusy(null);
    }
  }

  return (
    <Card className="border-brand/40 bg-brand-light/20 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-light text-brand-dark">
          {offer.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar host is arbitrary/admin-configured, not known at build time
            <img src={offer.avatarUrl} alt={offer.fullName} width={44} height={44} className="h-full w-full object-cover" />
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
            <p className="font-display text-[15px] font-semibold text-ink">{offer.fullName || "A Guy"}</p>
            <p className="font-display text-xl font-bold text-ink">{formatCents(offer.amountCents)}</p>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
            {offer.avgRating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {offer.avgRating.toFixed(1)} ({offer.ratingCount})
              </span>
            )}
            <span>{offer.completedJobsCount} jobs completed</span>
          </div>
          {(offer.identityVerified || offer.backgroundCheckStatus === "passed") && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {offer.identityVerified && (
                <Badge variant="trust">
                  <ShieldCheck className="h-3 w-3" /> ID verified
                </Badge>
              )}
              {offer.backgroundCheckStatus === "passed" && <Badge variant="trust">Background checked</Badge>}
            </div>
          )}
          {offer.note && <p className="mt-2 text-sm text-ink-soft">{offer.note}</p>}
        </div>
      </div>

      {error && <ErrorState message={error} />}

      {isMyTurn ? (
        <>
          {showCounter ? (
            <form onSubmit={handleCounter} className="mt-3 space-y-2 rounded-xl border border-line bg-paper p-3">
              <div>
                <Label htmlFor={`counter-amount-${offer.guyId}`}>Your counter-price</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft">$</span>
                  <Input
                    id={`counter-amount-${offer.guyId}`}
                    type="number"
                    min={1}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    className="pl-7"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`counter-note-${offer.guyId}`}>Note (optional)</Label>
                <Textarea
                  id={`counter-note-${offer.guyId}`}
                  rows={2}
                  maxLength={1000}
                  value={counterNote}
                  onChange={(e) => setCounterNote(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" variant="trust" disabled={busy !== null} className="flex-1">
                  {busy === "counter" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send counter-offer"}
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy !== null} onClick={() => setShowCounter(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-3 flex gap-2">
              <Button className="flex-1" onClick={handleAccept} disabled={busy !== null}>
                {busy === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept & Pay"}
              </Button>
              <Button variant="outline" onClick={() => setShowCounter(true)} disabled={busy !== null}>
                Counter
              </Button>
              <Button variant="outline" onClick={handleDecline} disabled={busy !== null}>
                {busy === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-soft">You countered with {formatCents(offer.amountCents)} — waiting on the Guy to respond.</p>
      )}
    </Card>
  );
}
