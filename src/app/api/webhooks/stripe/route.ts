import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/actions/notifications";

/**
 * Finalizes payments started via StripeConnectProcessor's hosted Checkout
 * Session (see src/lib/payments/stripe-processor.ts). Only relevant once
 * STRIPE_SECRET_KEY is configured — the demo processor never redirects here
 * because it settles synchronously.
 *
 * Two separate Stripe webhook endpoints point at this same URL, each with
 * its own signing secret: a plain account endpoint for checkout.session.completed
 * (fires on the platform's own account, where charges land) and a Connect
 * endpoint (`connect: true`) for account.updated (fires on a Guy's connected
 * account as their onboarding status changes). Since either secret can sign
 * an incoming request, try both rather than picking one.
 */
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecrets = [process.env.STRIPE_WEBHOOK_SECRET, process.env.STRIPE_CONNECT_WEBHOOK_SECRET].filter(
    (s): s is string => Boolean(s),
  );
  if (!secretKey || webhookSecrets.length === 0) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" as Stripe.LatestApiVersion });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event | null = null;
  let lastError: unknown = null;
  for (const secret of webhookSecrets) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, secret);
      break;
    } catch (err) {
      lastError = err;
    }
  }
  if (!event) {
    return NextResponse.json({ error: `Invalid signature: ${lastError instanceof Error ? lastError.message : "unknown"}` }, { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: Stripe redelivers events on timeout or an ambiguous
  // response, and this handler writes real ledger rows — an insert here
  // that fails (unique violation) means we've already processed this
  // exact event, so skip re-running the side effects below.
  const { error: dedupeErr } = await admin.from("processed_webhook_events").insert({ event_id: event.id, processor: "stripe" });
  if (dedupeErr) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    if (!jobId) return NextResponse.json({ received: true });

    const { data: job } = await admin.from("jobs").select("*").eq("id", jobId).single();
    if (!job) return NextResponse.json({ received: true });

    await admin
      .from("payments")
      .update({ status: "succeeded" })
      .eq("job_id", jobId)
      .eq("processor_payment_intent_id", session.id);

    const { data: payment } = await admin.from("payments").select("*").eq("job_id", jobId).eq("processor_payment_intent_id", session.id).single();

    await admin.from("transactions").insert([
      { job_id: jobId, payment_id: payment?.id ?? null, type: "charge", account: "customer", amount_cents: job.total_cents, description: "Customer payment" },
      { job_id: jobId, payment_id: payment?.id ?? null, type: "platform_fee", account: "platform", amount_cents: job.platform_fee_cents, description: "Platform fee" },
    ]);

    if (job.status === "REQUESTED") {
      await admin.from("jobs").update({ status: "MATCHING" }).eq("id", jobId);
      await admin.from("job_status_history").insert({ job_id: jobId, status: "MATCHING", changed_by: null, note: "system-payment-confirmed" });
      await notify(job.customer_id, "job_matching", "Payment confirmed", "We're finding you a Guy now.", { jobId });
    } else if (job.status === "QUOTED") {
      await admin.from("jobs").update({ status: "ACCEPTED" }).eq("id", jobId);
      await admin.from("job_status_history").insert({ job_id: jobId, status: "ACCEPTED", changed_by: null, note: "system-payment-confirmed" });
    } else if (job.status === "ACCEPTED" && job.guy_id) {
      // Multi-offer quote-acceptance path (acceptQuote() in jobs.ts). That
      // action already claims the job ACCEPTED + sets guy_id BEFORE
      // charging (so it stops showing as open the instant it's claimed),
      // but with a live processor it returns early on charge.redirectUrl
      // without finalizing the offer thread — that finalization happens
      // here, once the hosted Checkout actually completes.
      const { data: thread } = await admin
        .from("quotes")
        .select("id")
        .eq("job_id", jobId)
        .eq("guy_id", job.guy_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (thread) await admin.from("quotes").update({ status: "accepted" }).eq("id", thread.id);
      await admin.from("job_status_history").insert({ job_id: jobId, status: "ACCEPTED", changed_by: null, note: "system-payment-confirmed" });

      const { data: otherOpenThreads } = await admin
        .from("quotes")
        .select("id, guy_id, created_at")
        .eq("job_id", jobId)
        .eq("status", "pending")
        .neq("guy_id", job.guy_id)
        .order("created_at", { ascending: false });
      const latestByGuy = new Map<string, { id: string }>();
      for (const row of otherOpenThreads ?? []) {
        if (!latestByGuy.has(row.guy_id)) latestByGuy.set(row.guy_id, { id: row.id });
      }
      const idsToDecline = [...latestByGuy.values()].map((r) => r.id);
      if (idsToDecline.length) {
        await admin.from("quotes").update({ status: "declined" }).in("id", idsToDecline);
        for (const otherGuyId of latestByGuy.keys()) {
          await notify(otherGuyId, "job_declined", "Job filled", "The customer went with another Guy for this job.", { jobId });
        }
      }
      await notify(job.guy_id, "job_accepted", "Offer accepted!", "The customer accepted your offer. Time to get it scheduled.", { jobId });
    }
  } else if (event.type === "account.updated") {
    // Keep guy_profiles.stripe_payouts_enabled in sync with the connected
    // account's actual transfer capability, so settleCompletedJob's payout
    // check reflects reality instead of just "an account id exists."
    const account = event.data.object as Stripe.Account;
    const transfersActive = account.capabilities?.transfers === "active";
    await admin.from("guy_profiles").update({ stripe_payouts_enabled: transfersActive }).eq("stripe_connect_account_id", account.id);
  }

  return NextResponse.json({ received: true });
}
