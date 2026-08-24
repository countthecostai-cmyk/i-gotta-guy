"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProcessor } from "@/lib/payments";
import {
  calculatePricing, calculateProviderPayout, type AddonForPricing, type PlatformFeeRule,
} from "@/lib/domain/pricing";
import { assertTransition, type JobStatus } from "@/lib/domain/job-state-machine";
import { notify } from "./notifications";
import type { Database } from "@/types/database";
import { ActionError } from "./errors";

export type Job = Database["public"]["Tables"]["jobs"]["Row"];

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");
  return { supabase, user };
}

async function getFeeRule(admin: ReturnType<typeof createAdminClient>, serviceId: string): Promise<PlatformFeeRule> {
  const { data } = await admin
    .from("platform_fee_rules")
    .select("fee_type, fee_value, min_fee_cents, service_id")
    .eq("active", true)
    .or(`service_id.eq.${serviceId},service_id.is.null`)
    .order("service_id", { ascending: false, nullsFirst: false }) // service-specific rule wins over global
    .limit(1)
    .maybeSingle();

  return data
    ? { fee_type: data.fee_type as "percent" | "flat", fee_value: data.fee_value, min_fee_cents: data.min_fee_cents }
    : { fee_type: "percent", fee_value: 15, min_fee_cents: 300 };
}

async function recordLedger(
  admin: ReturnType<typeof createAdminClient>,
  jobId: string,
  paymentId: string | null,
  entries: Array<{ type: Database["public"]["Tables"]["transactions"]["Row"]["type"]; account: "customer" | "platform" | "provider"; amount_cents: number; description?: string }>,
) {
  const rows = entries.filter((e) => e.amount_cents > 0).map((e) => ({ job_id: jobId, payment_id: paymentId, ...e }));
  if (rows.length) await admin.from("transactions").insert(rows);
}

// `changed_by` is a uuid FK to profiles — pass a real user id, or null for
// system-initiated transitions (never a placeholder string like "system";
// that silently fails the insert since it isn't a valid uuid). Attribute
// system actions via `note` instead, e.g. logStatus(admin, id, "MATCHING",
// null, "system: payment confirmed").
async function logStatus(admin: ReturnType<typeof createAdminClient>, jobId: string, status: JobStatus, changedBy: string | null, note?: string) {
  const { error } = await admin.from("job_status_history").insert({ job_id: jobId, status, changed_by: changedBy, note: note ?? null });
  if (error) console.error(`[logStatus] failed to log ${status} for job ${jobId}:`, error.message);
}

const requestJobSchema = z.object({
  serviceId: z.string().uuid(),
  addressId: z.string().uuid(),
  details: z.record(z.string(), z.unknown()).refine((d) => JSON.stringify(d).length <= 20_000, "Too much detail submitted.").default({}),
  addonIds: z.array(z.string().uuid()).max(50).default([]),
  quantity: z.number().positive().nullable().optional(),
  description: z.string().max(2000).default(""),
  isAsap: z.boolean().default(false),
  scheduledStart: z.string().datetime().nullable().optional(),
  preferredGuyId: z.string().uuid().nullable().optional(),
  promotionCode: z.string().nullable().optional(),
});

export type RequestJobInput = z.infer<typeof requestJobSchema>;

/**
 * The core "Request Service" action. Computes pricing server-side (never
 * trust a client-supplied price), charges the customer for fixed-price
 * services, and opens the job for matching. Quote-priced services skip
 * payment until a Guy quotes and the customer accepts.
 */
export async function createJobRequest(input: RequestJobInput) {
  const parsed = requestJobSchema.parse(input);
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: service, error: serviceErr } = await supabase
    .from("services")
    .select("*")
    .eq("id", parsed.serviceId)
    .eq("active", true)
    .single();
  if (serviceErr || !service) throw new ActionError("This service is not available.");

  const { data: address, error: addrErr } = await supabase
    .from("addresses")
    .select("*")
    .eq("id", parsed.addressId)
    .eq("user_id", user.id)
    .single();
  if (addrErr || !address) throw new ActionError("Address not found.");

  let addons: AddonForPricing[] = [];
  if (parsed.addonIds.length) {
    const { data: addonRows } = await supabase
      .from("service_addons")
      .select("id, price_cents")
      .in("id", parsed.addonIds)
      .eq("service_id", parsed.serviceId)
      .eq("active", true);
    addons = addonRows ?? [];
  }

  let preferredGuy: { id: string; custom_base_price_cents: number | null } | null = null;
  if (parsed.preferredGuyId) {
    const { data: gs } = await supabase
      .from("guy_services")
      .select("guy_id, custom_base_price_cents, active")
      .eq("guy_id", parsed.preferredGuyId)
      .eq("service_id", parsed.serviceId)
      .maybeSingle();
    if (gs?.active) preferredGuy = { id: gs.guy_id, custom_base_price_cents: gs.custom_base_price_cents };
  }

  const feeRule = await getFeeRule(admin, parsed.serviceId);

  let promotion = null;
  let promotionId: string | null = null;
  if (parsed.promotionCode) {
    const { data: promo } = await supabase
      .from("promotions")
      .select("*")
      .eq("code", parsed.promotionCode.toUpperCase())
      .eq("active", true)
      .maybeSingle();
    if (promo && (!promo.max_uses || promo.used_count < promo.max_uses) && (!promo.expires_at || new Date(promo.expires_at) > new Date())) {
      promotion = { discount_type: promo.discount_type as "percent" | "flat", discount_value: promo.discount_value };
      promotionId = promo.id;
    }
  }

  // Idempotency guard: if this same customer already has a very recent,
  // still-open job for this exact service+address, return it instead of
  // creating (and charging) a second one. Covers double-submits from a
  // slow network retry or a duplicate client call slipping past the UI's
  // own disabled-while-submitting guard.
  const dedupeWindow = new Date(Date.now() - 30_000).toISOString();
  const { data: recentDupe } = await admin
    .from("jobs")
    .select("id, status")
    .eq("customer_id", user.id)
    .eq("service_id", parsed.serviceId)
    .eq("address_id", parsed.addressId)
    .in("status", ["REQUESTED", "MATCHING", "ACCEPTED", "SCHEDULED"])
    .gte("created_at", dedupeWindow)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recentDupe) {
    return { jobId: recentDupe.id, redirectUrl: null as string | null, needsQuote: false };
  }

  const pricing = calculatePricing({
    service: { pricing_model: service.pricing_model, base_price_cents: service.base_price_cents, min_price_cents: service.min_price_cents },
    customBasePriceCents: preferredGuy?.custom_base_price_cents ?? null,
    quantity: parsed.quantity ?? undefined,
    selectedAddons: addons,
    feeRule,
    promotion,
  });

  const initialStatus: JobStatus = service.pricing_model === "quote" ? "MATCHING" : "REQUESTED";

  const { data: job, error: jobErr } = await admin
    .from("jobs")
    .insert({
      customer_id: user.id,
      service_id: service.id,
      guy_id: null,
      address_id: address.id,
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      status: initialStatus,
      description: parsed.description,
      details: parsed.details,
      addon_ids: parsed.addonIds,
      quantity: parsed.quantity ?? null,
      is_asap: parsed.isAsap,
      scheduled_start: parsed.scheduledStart ?? null,
      service_amount_cents: pricing.serviceAmountCents,
      addon_amount_cents: pricing.addonAmountCents,
      discount_cents: pricing.discountCents,
      tax_cents: pricing.taxCents,
      platform_fee_cents: pricing.platformFeeCents,
      total_cents: pricing.totalCents,
      promotion_id: promotionId,
    })
    .select()
    .single();
  if (jobErr || !job) throw new ActionError(jobErr?.message ?? "Could not create job request.");
  await logStatus(admin, job.id, initialStatus, user.id);

  if (service.pricing_model === "quote") {
    revalidatePath("/app/jobs");
    return { jobId: job.id, redirectUrl: null as string | null, needsQuote: true };
  }

  // Fixed-price service: charge now.
  const processor = getPaymentProcessor();
  const charge = await processor.chargeCustomer({
    jobId: job.id,
    customerId: user.id,
    amountCents: pricing.totalCents,
    description: `${service.name} — I Gotta Guy`,
  });

  const { data: payment } = await admin
    .from("payments")
    .insert({
      job_id: job.id,
      customer_id: user.id,
      amount_cents: pricing.totalCents,
      kind: "charge",
      status: charge.status === "succeeded" ? "succeeded" : charge.status === "failed" ? "failed" : "pending",
      processor: processor.name,
      processor_payment_intent_id: charge.processorPaymentIntentId,
      processor_fee_cents: charge.processorFeeCents,
    })
    .select()
    .single();

  if (!charge.success) {
    await admin.from("jobs").update({ status: "CANCELLED", cancellation_reason: "Payment failed" }).eq("id", job.id);
    await logStatus(admin, job.id, "CANCELLED", null, `system: payment failed${charge.failureReason ? ` — ${charge.failureReason}` : ""}`);
    throw new ActionError(charge.failureReason ?? "Payment failed. Please try again.");
  }

  if (charge.redirectUrl) {
    // Live processor requires a hosted checkout redirect. Job stays
    // REQUESTED; a webhook finalizes it to MATCHING on success.
    return { jobId: job.id, redirectUrl: charge.redirectUrl, needsQuote: false };
  }

  // Demo / synchronous processor: finalize immediately.
  await recordLedger(admin, job.id, payment?.id ?? null, [
    { type: "charge", account: "customer", amount_cents: pricing.totalCents, description: "Customer payment" },
    { type: "platform_fee", account: "platform", amount_cents: pricing.platformFeeCents, description: "Platform fee" },
    { type: "processor_fee", account: "platform", amount_cents: charge.processorFeeCents, description: "Payment processor fee" },
    { type: "discount", account: "platform", amount_cents: pricing.discountCents, description: "Promotion discount" },
  ]);

  if (promotionId && pricing.discountCents > 0) {
    // Atomic, race-safe increment — only succeeds while still under the
    // cap, so two concurrent redemptions of the last available use can't
    // both succeed.
    const { data: redeemed } = await admin.rpc("redeem_promotion", { promo_id: promotionId });
    if (!redeemed) console.error(`[promotion] ${promotionId} hit its usage cap mid-redemption for job ${job.id}`);
  }

  const nextStatus: JobStatus = preferredGuy ? "ACCEPTED" : "MATCHING";
  await admin
    .from("jobs")
    .update({ status: nextStatus, guy_id: preferredGuy?.id ?? null })
    .eq("id", job.id);
  await logStatus(admin, job.id, nextStatus, null, "system: payment confirmed");

  if (preferredGuy) {
    await notify(preferredGuy.id, "job_accepted", "New job booked", `You've been requested directly for a ${service.name} job.`, { jobId: job.id });
  }

  revalidatePath("/app/jobs");
  return { jobId: job.id, redirectUrl: null as string | null, needsQuote: false };
}

/** A Guy claims an open job from the matching pool (non-quote services). */
export async function acceptOpenJob(jobId: string) {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: guy } = await supabase.from("guy_profiles").select("id, status").eq("id", user.id).single();
  if (!guy || guy.status !== "approved") throw new ActionError("Only approved Guys can accept jobs.");

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job) throw new ActionError("Job not found.");
  assertTransition(job.status as JobStatus, "ACCEPTED", "guy");

  // acceptOpenJob writes via the service-role client (bypasses RLS), so the
  // `jobs_select`/`jobs_update` RLS eligibility check (Guy must have this
  // service active in guy_services) does NOT apply here automatically —
  // re-enforce it explicitly, or any approved Guy could accept any job
  // regardless of which services they actually offer.
  const { data: eligible } = await supabase
    .from("guy_services")
    .select("guy_id")
    .eq("guy_id", user.id)
    .eq("service_id", job.service_id)
    .eq("active", true)
    .maybeSingle();
  if (!eligible) throw new ActionError("You don't currently offer this service.");

  // Atomic claim: only succeeds if still unassigned, preventing two Guys
  // from accepting the same job in a race.
  const { data: claimed, error } = await admin
    .from("jobs")
    .update({ status: "ACCEPTED", guy_id: user.id })
    .eq("id", jobId)
    .eq("status", "MATCHING")
    .is("guy_id", null)
    .select()
    .maybeSingle();

  if (error || !claimed) throw new ActionError("This job was just claimed by another Guy.");

  await logStatus(admin, jobId, "ACCEPTED", user.id);
  await notify(job.customer_id, "job_accepted", "A Guy accepted your job!", "Your job has been assigned and is on the schedule.", { jobId });
  revalidatePath("/guy/jobs");
  revalidatePath(`/app/jobs/${jobId}`);
  return { success: true };
}

const submitQuoteSchema = z.object({ jobId: z.string().uuid(), amountCents: z.number().int().positive(), note: z.string().max(1000).default("") });

/** A Guy submits a custom quote for a 'quote' pricing-model job. */
export async function submitQuote(input: z.infer<typeof submitQuoteSchema>) {
  const parsed = submitQuoteSchema.parse(input);
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: guy } = await supabase.from("guy_profiles").select("id, status").eq("id", user.id).single();
  if (!guy || guy.status !== "approved") throw new ActionError("Only approved Guys can submit quotes.");

  const { data: job } = await supabase.from("jobs").select("*").eq("id", parsed.jobId).single();
  if (!job) throw new ActionError("Job not found.");
  assertTransition(job.status as JobStatus, "QUOTED", "guy");

  // Same admin-client-bypasses-RLS reasoning as acceptOpenJob above.
  const { data: eligible } = await supabase
    .from("guy_services")
    .select("guy_id")
    .eq("guy_id", user.id)
    .eq("service_id", job.service_id)
    .eq("active", true)
    .maybeSingle();
  if (!eligible) throw new ActionError("You don't currently offer this service.");

  const { data: claimed, error } = await admin
    .from("jobs")
    .update({ status: "QUOTED", guy_id: user.id, service_amount_cents: parsed.amountCents })
    .eq("id", parsed.jobId)
    .eq("status", "MATCHING")
    .is("guy_id", null)
    .select()
    .maybeSingle();
  if (error || !claimed) throw new ActionError("This job already has a quote from another Guy.");

  await admin.from("quotes").insert({ job_id: parsed.jobId, guy_id: user.id, amount_cents: parsed.amountCents, note: parsed.note });
  await logStatus(admin, parsed.jobId, "QUOTED", user.id, parsed.note);
  await notify(job.customer_id, "job_matching", "You got a quote!", "A Guy sent you a price for your job.", { jobId: parsed.jobId });
  revalidatePath(`/app/jobs/${parsed.jobId}`);
  return { success: true };
}

/** Customer accepts a quote and pays. */
export async function acceptQuote(jobId: string) {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("customer_id", user.id).single();
  if (!job) throw new ActionError("Job not found.");
  assertTransition(job.status as JobStatus, "ACCEPTED", "customer");

  const { data: service } = await supabase.from("services").select("name").eq("id", job.service_id).maybeSingle();

  const feeRule = await getFeeRule(admin, job.service_id);
  const pricing = calculatePricing({
    service: { pricing_model: "quote", base_price_cents: 0, min_price_cents: 0 },
    quotedAmountCents: job.service_amount_cents,
    feeRule,
  });

  const processor = getPaymentProcessor();
  const charge = await processor.chargeCustomer({
    jobId, customerId: user.id, amountCents: pricing.totalCents,
    description: `${service?.name ?? "Service"} — I Gotta Guy`,
  });

  const { data: payment } = await admin
    .from("payments")
    .insert({ job_id: jobId, customer_id: user.id, amount_cents: pricing.totalCents, status: charge.status === "succeeded" ? "succeeded" : "pending", processor: processor.name, processor_payment_intent_id: charge.processorPaymentIntentId, processor_fee_cents: charge.processorFeeCents })
    .select()
    .single();

  if (!charge.success) throw new ActionError(charge.failureReason ?? "Payment failed.");
  if (charge.redirectUrl) return { redirectUrl: charge.redirectUrl };

  await recordLedger(admin, jobId, payment?.id ?? null, [
    { type: "charge", account: "customer", amount_cents: pricing.totalCents, description: "Customer payment" },
    { type: "platform_fee", account: "platform", amount_cents: pricing.platformFeeCents, description: "Platform fee" },
    { type: "processor_fee", account: "platform", amount_cents: charge.processorFeeCents, description: "Payment processor fee" },
  ]);

  await admin
    .from("jobs")
    .update({ status: "ACCEPTED", platform_fee_cents: pricing.platformFeeCents, total_cents: pricing.totalCents })
    .eq("id", jobId);
  await logStatus(admin, jobId, "ACCEPTED", user.id);
  if (job.guy_id) await notify(job.guy_id, "job_accepted", "Quote accepted!", "The customer accepted your quote. Time to get it scheduled.", { jobId });

  revalidatePath(`/app/jobs/${jobId}`);
  return { redirectUrl: null };
}

export async function declineQuote(jobId: string) {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("customer_id", user.id).single();
  if (!job) throw new ActionError("Job not found.");
  assertTransition(job.status as JobStatus, "DECLINED", "customer");

  await admin.from("jobs").update({ status: "MATCHING", guy_id: null }).eq("id", jobId);
  await logStatus(admin, jobId, "DECLINED", user.id);
  await logStatus(admin, jobId, "MATCHING", null, "system: reopened after decline");
  if (job.guy_id) await notify(job.guy_id, "job_declined", "Quote declined", "The customer declined your quote.", { jobId });
  revalidatePath(`/app/jobs/${jobId}`);
  return { success: true };
}

const STATUS_UPDATE_ACTOR_STATUSES: JobStatus[] = ["SCHEDULED", "EN_ROUTE", "ARRIVED", "IN_PROGRESS", "COMPLETED"];

/** Guy-driven job status progression (en route, arrived, in progress, completed). */
export async function updateJobStatus(jobId: string, nextStatus: JobStatus, note?: string) {
  if (!STATUS_UPDATE_ACTOR_STATUSES.includes(nextStatus)) throw new ActionError("Invalid status update.");
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("guy_id", user.id).single();
  if (!job) throw new ActionError("Job not found or not assigned to you.");
  assertTransition(job.status as JobStatus, nextStatus, "guy");

  // Atomic, conditional on the status we just read — if a concurrent
  // request (double-tap, two tabs) already advanced this job, this update
  // matches zero rows and we bail out instead of re-running side effects
  // (notifications, and — critically for COMPLETED — a second payout).
  const { data: updated, error: updateErr } = await admin
    .from("jobs")
    .update({ status: nextStatus })
    .eq("id", jobId)
    .eq("status", job.status)
    .select()
    .maybeSingle();
  if (updateErr || !updated) throw new ActionError("This job's status just changed — refresh and try again.");
  await logStatus(admin, jobId, nextStatus, user.id, note);

  const eventMap: Partial<Record<JobStatus, { type: Parameters<typeof notify>[1]; title: string; body: string }>> = {
    SCHEDULED: { type: "job_scheduled", title: "Job scheduled", body: "Your job has a scheduled time." },
    EN_ROUTE: { type: "job_en_route", title: "Your Guy is on the way", body: "" },
    ARRIVED: { type: "job_arrived", title: "Your Guy has arrived", body: "" },
    IN_PROGRESS: { type: "job_in_progress", title: "Job started", body: "Work is underway." },
    COMPLETED: { type: "job_completed", title: "Job completed", body: "Take a look and leave a review when you're ready." },
  };
  const event = eventMap[nextStatus];
  if (event) await notify(job.customer_id, event.type, event.title, event.body, { jobId });

  if (nextStatus === "COMPLETED") {
    await settleCompletedJob(admin, { ...job, status: "COMPLETED" } as Job);
  }

  revalidatePath(`/guy/jobs/${jobId}`);
  revalidatePath(`/app/jobs/${jobId}`);
  return { success: true };
}

/**
 * Runs the payout ledger once a job is marked COMPLETED. Exported so admin
 * actions (e.g. resolving a dispute in the Guy's favor) can settle a job
 * the same way the normal guy-driven completion flow does — the Guy must
 * actually get paid, not just have the job's status flipped.
 */
export async function settleCompletedJob(admin: ReturnType<typeof createAdminClient>, job: Job) {
  // Idempotency backstop: updateJobStatus's atomic status guard already
  // ensures this runs at most once per COMPLETED transition, but a payout
  // is real money — check for an existing *completion* payout too rather
  // than trusting a single call site (filtered to type='completion' since
  // a job can separately and legitimately have tip payout rows). A
  // partial unique index on provider_payouts(job_id) where
  // type='completion' backs this up at the DB level.
  const { data: existingPayout } = await admin.from("provider_payouts").select("id").eq("job_id", job.id).eq("type", "completion").maybeSingle();
  if (existingPayout) {
    console.error(`[settleCompletedJob] job ${job.id} already has a payout — skipping duplicate settlement.`);
    return;
  }

  const payoutCents = calculateProviderPayout({
    serviceAmountCents: job.service_amount_cents,
    addonAmountCents: job.addon_amount_cents,
    discountCents: job.discount_cents,
    taxCents: job.tax_cents,
    platformFeeCents: job.platform_fee_cents,
    tipCents: job.tip_cents,
    totalCents: job.total_cents,
    isEstimate: false,
  });

  await admin.from("jobs").update({ status: "PAYOUT_PENDING" }).eq("id", job.id);
  await logStatus(admin, job.id, "PAYOUT_PENDING", null, "system: settlement started");

  const { data: guy } = await admin.from("guy_profiles").select("stripe_connect_account_id, completed_jobs_count").eq("id", job.guy_id!).single();

  const processor = getPaymentProcessor();
  const payout = await processor.payoutProvider({
    guyId: job.guy_id!, jobId: job.id, amountCents: payoutCents, connectAccountRef: guy?.stripe_connect_account_id ?? null,
  });

  await admin.from("provider_payouts").insert({
    guy_id: job.guy_id!, job_id: job.id, amount_cents: payoutCents, type: "completion",
    status: payout.success ? "paid" : "failed", processor_transfer_id: payout.processorTransferId,
    paid_at: payout.success ? new Date().toISOString() : null,
  });

  if (payout.success) {
    await recordLedger(admin, job.id, null, [
      { type: "provider_payout", account: "provider", amount_cents: payoutCents, description: "Provider earnings" },
    ]);
    await admin.from("jobs").update({ status: "PAYOUT_COMPLETED" }).eq("id", job.id);
    await logStatus(admin, job.id, "PAYOUT_COMPLETED", null, "system: payout sent");
    await admin
      .from("guy_profiles")
      .update({ completed_jobs_count: (guy?.completed_jobs_count ?? 0) + 1 })
      .eq("id", job.guy_id!);
    await notify(job.guy_id!, "payout_sent", "You got paid!", `Your payout for this job has been sent.`, { jobId: job.id });
  }
}

export async function cancelJob(jobId: string, reason: string) {
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
  if (!job) throw new ActionError("Job not found.");

  const isOwner = job.customer_id === user.id || job.guy_id === user.id;
  if (!isOwner && profile?.role !== "admin") throw new ActionError("You cannot cancel this job.");

  const actor = profile?.role === "admin" ? "admin" : job.customer_id === user.id ? "customer" : "guy";
  assertTransition(job.status as JobStatus, "CANCELLED", actor);

  // Atomic, conditional on the status we just read — prevents two
  // concurrent cancel calls (e.g. double-tap) from both proceeding to the
  // refund step below and issuing two refunds for the same payment.
  const { data: cancelled, error: cancelErr } = await admin
    .from("jobs")
    .update({ status: "CANCELLED", cancelled_by: user.id, cancellation_reason: reason })
    .eq("id", jobId)
    .eq("status", job.status)
    .select()
    .maybeSingle();
  if (cancelErr || !cancelled) throw new ActionError("This job's status just changed — refresh and try again.");
  await logStatus(admin, jobId, "CANCELLED", user.id, reason);

  // Conditional on status = 'succeeded' so a concurrent/duplicate call
  // that already flipped this payment to 'refunded' can't refund twice.
  // Scoped to kind='charge' — a job can also have a separate tip payment
  // row (see addTip), and cancellation should only ever touch the
  // primary service charge. (In practice a tip can't exist yet at this
  // point in the job lifecycle, but this keeps the query correct even if
  // that ever changes, and .maybeSingle() would otherwise error on >1 row.)
  const { data: payment } = await admin
    .from("payments")
    .update({ status: "refund_pending" })
    .eq("job_id", jobId)
    .eq("kind", "charge")
    .eq("status", "succeeded")
    .select()
    .maybeSingle();
  if (payment) {
    const processor = getPaymentProcessor();
    const refund = await processor.refund({ jobId, processorPaymentIntentId: payment.processor_payment_intent_id, amountCents: payment.amount_cents, reason });
    if (refund.success) {
      await admin.from("payments").update({ status: "refunded", refunded_cents: payment.amount_cents }).eq("id", payment.id);
      await recordLedger(admin, jobId, payment.id, [{ type: "refund", account: "customer", amount_cents: payment.amount_cents, description: "Cancellation refund" }]);
      await admin.from("jobs").update({ status: "REFUNDED" }).eq("id", jobId);
      await logStatus(admin, jobId, "REFUNDED", null, "system: refund issued");
    } else {
      // Refund failed at the processor — put the payment back so it isn't
      // stuck in limbo and support/retry logic can find it again.
      await admin.from("payments").update({ status: "succeeded" }).eq("id", payment.id);
    }
  }

  const otherParty = job.customer_id === user.id ? job.guy_id : job.customer_id;
  if (otherParty) await notify(otherParty, "job_cancelled", "Job cancelled", reason || "The job was cancelled.", { jobId });

  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath(`/guy/jobs/${jobId}`);
  return { success: true };
}

const tipSchema = z.object({ jobId: z.string().uuid(), amountCents: z.number().int().positive().max(50000) });

export async function addTip(input: z.infer<typeof tipSchema>) {
  const parsed = tipSchema.parse(input);
  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: job } = await supabase.from("jobs").select("*").eq("id", parsed.jobId).eq("customer_id", user.id).single();
  if (!job) throw new ActionError("Job not found.");
  if (!["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"].includes(job.status)) {
    throw new ActionError("You can tip once the job is complete.");
  }
  if (!job.guy_id) throw new ActionError("No Guy on this job to tip.");

  // Idempotency guard against a double-submit charging the same tip twice.
  const dedupeWindow = new Date(Date.now() - 15_000).toISOString();
  const { count: recentTipCount } = await admin
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id)
    .eq("type", "tip")
    .eq("account", "customer")
    .eq("amount_cents", parsed.amountCents)
    .gte("created_at", dedupeWindow);
  if (recentTipCount && recentTipCount > 0) {
    return { redirectUrl: null, success: true };
  }

  const processor = getPaymentProcessor();
  const charge = await processor.chargeCustomer({ jobId: job.id, customerId: user.id, amountCents: parsed.amountCents, description: "Tip — I Gotta Guy" });
  if (!charge.success) throw new ActionError(charge.failureReason ?? "Tip payment failed.");
  if (charge.redirectUrl) return { redirectUrl: charge.redirectUrl };

  const { data: payment } = await admin
    .from("payments")
    .insert({ job_id: job.id, customer_id: user.id, amount_cents: parsed.amountCents, kind: "tip", status: "succeeded", processor: processor.name, processor_payment_intent_id: charge.processorPaymentIntentId, processor_fee_cents: charge.processorFeeCents })
    .select()
    .single();

  await recordLedger(admin, job.id, payment?.id ?? null, [
    { type: "tip", account: "customer", amount_cents: parsed.amountCents, description: "Tip charge" },
    { type: "processor_fee", account: "platform", amount_cents: charge.processorFeeCents, description: "Payment processor fee" },
  ]);

  await admin.from("jobs").update({ tip_cents: job.tip_cents + parsed.amountCents, total_cents: job.total_cents + parsed.amountCents }).eq("id", job.id);

  const { data: guy } = await admin.from("guy_profiles").select("stripe_connect_account_id").eq("id", job.guy_id).single();
  const payout = await processor.payoutProvider({ guyId: job.guy_id, jobId: job.id, amountCents: parsed.amountCents, connectAccountRef: guy?.stripe_connect_account_id ?? null });
  if (payout.success) {
    await admin.from("provider_payouts").insert({ guy_id: job.guy_id, job_id: job.id, amount_cents: parsed.amountCents, type: "tip", status: "paid", processor_transfer_id: payout.processorTransferId, paid_at: new Date().toISOString() });
    await recordLedger(admin, job.id, null, [{ type: "tip", account: "provider", amount_cents: parsed.amountCents, description: "Tip payout" }]);
    await notify(job.guy_id, "payout_sent", "You got tipped!", "A customer left you a tip.", { jobId: job.id });
  }

  revalidatePath(`/app/jobs/${job.id}`);
  return { redirectUrl: null, success: true };
}
