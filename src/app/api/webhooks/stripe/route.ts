import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/actions/notifications";

/**
 * Finalizes payments started via StripeConnectProcessor's hosted Checkout
 * Session (see src/lib/payments/stripe-processor.ts). Only relevant once
 * STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET are configured — the demo
 * processor never redirects here because it settles synchronously.
 */
export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 501 });
  }

  const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" as Stripe.LatestApiVersion });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json({ error: `Invalid signature: ${err instanceof Error ? err.message : "unknown"}` }, { status: 400 });
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
    }
  }

  return NextResponse.json({ received: true });
}
