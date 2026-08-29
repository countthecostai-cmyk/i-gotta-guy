"use client";

import { useState } from "react";
import { Loader2, Wallet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/primitives";
import { createGuyPayoutOnboardingLink } from "@/lib/actions/guys";
import { ActionError } from "@/lib/actions/errors";

/**
 * Shown on the earnings page until this Guy has finished Stripe Connect
 * onboarding. Without it, settleCompletedJob() can compute a payout but has
 * nowhere to send it — payoutProvider() just fails gracefully and the job
 * sits at PAYOUT_PENDING. `stripe_payouts_enabled` is kept accurate by the
 * `account.updated` webhook once Stripe confirms transfers are active.
 */
export function PayoutSetupBanner({ hasAccount, payoutsEnabled }: { hasAccount: boolean; payoutsEnabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (payoutsEnabled) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const { url } = await createGuyPayoutOnboardingLink();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't start payout setup. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3 border-warn/40 bg-warn/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2">
        <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-ink-soft" />
        <div>
          <p className="text-sm font-semibold text-ink">
            {hasAccount ? "Finish setting up payouts" : "Set up payouts to get paid"}
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">
            {hasAccount
              ? "You're almost done — Stripe still needs a bit more info before we can pay you."
              : "You need to connect a payout account before completed jobs can pay out to you."}
          </p>
        </div>
      </div>
      <div className="flex flex-col items-start gap-1 sm:items-end">
        <Button variant="primary" size="md" onClick={handleClick} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : hasAccount ? "Continue setup" : "Set up payouts"}
        </Button>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Card>
  );
}

export function PayoutsReadyBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-trust-dark">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Payouts active
    </div>
  );
}
