"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPaymentProcessor } from "@/lib/payments";
import { notify } from "./notifications";
import { ActionError } from "./errors";
import { settleCompletedJob, type Job } from "./jobs";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") throw new ActionError("Admin access required.");
  return { supabase, user };
}

export async function approveGuy(guyId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("guy_profiles").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", guyId);
  if (error) throw new ActionError(error.message);
  await notify(guyId, "guy_approved", "You're approved!", "Welcome to I Gotta Guy — set up your services and start taking jobs.");
  revalidatePath("/admin/guys");
  return { success: true };
}

export async function rejectGuy(guyId: string, reason: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("guy_profiles").update({ status: "rejected" }).eq("id", guyId);
  if (error) throw new ActionError(error.message);
  await notify(guyId, "guy_rejected", "Application update", reason || "Your application was not approved at this time.");
  revalidatePath("/admin/guys");
  return { success: true };
}

export async function suspendGuy(guyId: string, reason: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("guy_profiles").update({ status: "suspended" }).eq("id", guyId);
  if (error) throw new ActionError(error.message);
  await notify(guyId, "guy_rejected", "Account suspended", reason || "Your account has been suspended. Contact support for details.");
  revalidatePath("/admin/guys");
  return { success: true };
}

export async function reinstateGuy(guyId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin.from("guy_profiles").update({ status: "approved" }).eq("id", guyId);
  if (error) throw new ActionError(error.message);
  revalidatePath("/admin/guys");
  return { success: true };
}

const categorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1), slug: z.string().min(1), description: z.string().default(""),
  icon: z.string().default(""), sortOrder: z.number().int().default(0), active: z.boolean().default(true),
});

export async function upsertCategory(input: z.infer<typeof categorySchema>) {
  await requireAdmin();
  const admin = createAdminClient();
  const { id, sortOrder, ...rest } = categorySchema.parse(input);
  const { error } = await admin.from("service_categories").upsert({ id, sort_order: sortOrder, ...rest });
  if (error) throw new ActionError(error.message);
  revalidatePath("/admin/services");
  revalidatePath("/services");
  return { success: true };
}

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  categoryId: z.string().uuid(), name: z.string().min(1), slug: z.string().min(1),
  shortDescription: z.string().default(""), description: z.string().default(""),
  pricingModel: z.enum(["flat", "hourly", "quantity", "sqft", "quote"]),
  basePriceCents: z.number().int().min(0), minPriceCents: z.number().int().min(0),
  unitLabel: z.string().nullable().optional(), active: z.boolean().default(true),
  requestFields: z.array(z.object({
    key: z.string(), label: z.string(),
    type: z.enum(["text", "textarea", "number", "boolean", "select", "multiselect"]),
    required: z.boolean().optional(), options: z.array(z.string()).optional(),
  })).default([]),
});

export async function upsertService(input: z.infer<typeof serviceSchema>) {
  await requireAdmin();
  const admin = createAdminClient();
  const parsed = serviceSchema.parse(input);
  const { error } = await admin.from("services").upsert({
    id: parsed.id, category_id: parsed.categoryId, name: parsed.name, slug: parsed.slug,
    short_description: parsed.shortDescription, description: parsed.description, pricing_model: parsed.pricingModel,
    base_price_cents: parsed.basePriceCents, min_price_cents: parsed.minPriceCents, unit_label: parsed.unitLabel ?? null,
    active: parsed.active, request_fields: parsed.requestFields,
  });
  if (error) throw new ActionError(error.message);
  revalidatePath("/admin/services");
  revalidatePath("/services");
  return { success: true };
}

const feeRuleSchema = z.object({
  id: z.string().uuid().optional(), serviceId: z.string().uuid().nullable().optional(),
  feeType: z.enum(["percent", "flat"]), feeValue: z.number().nonnegative(), minFeeCents: z.number().int().min(0), active: z.boolean().default(true),
});

export async function upsertFeeRule(input: z.infer<typeof feeRuleSchema>) {
  await requireAdmin();
  const admin = createAdminClient();
  const parsed = feeRuleSchema.parse(input);
  const { error } = await admin.from("platform_fee_rules").upsert({ id: parsed.id, service_id: parsed.serviceId ?? null, fee_type: parsed.feeType, fee_value: parsed.feeValue, min_fee_cents: parsed.minFeeCents, active: parsed.active });
  if (error) throw new ActionError(error.message);
  revalidatePath("/admin/fees");
  return { success: true };
}

const promoSchema = z.object({
  id: z.string().uuid().optional(), code: z.string().min(2).max(40), description: z.string().default(""),
  discountType: z.enum(["percent", "flat"]), discountValue: z.number().nonnegative(),
  maxUses: z.number().int().positive().nullable().optional(), active: z.boolean().default(true), expiresAt: z.string().nullable().optional(),
});

export async function upsertPromotion(input: z.infer<typeof promoSchema>) {
  await requireAdmin();
  const admin = createAdminClient();
  const parsed = promoSchema.parse(input);
  const { error } = await admin.from("promotions").upsert({ id: parsed.id, code: parsed.code.toUpperCase(), description: parsed.description, discount_type: parsed.discountType, discount_value: parsed.discountValue, max_uses: parsed.maxUses ?? null, active: parsed.active, expires_at: parsed.expiresAt ?? null });
  if (error) throw new ActionError(error.message);
  revalidatePath("/admin/promotions");
  return { success: true };
}

/** Admin-initiated manual refund (disputes, goodwill, etc) — refunds the
 * job's primary service charge. A job that received a tip has a second,
 * separate 'succeeded' payments row (see addTip); scoping to
 * kind='charge' is required both to target the right charge and because
 * an unqualified query here would match multiple rows and error. */
export async function adminRefundJob(jobId: string, reason: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: payment } = await admin.from("payments").select("*").eq("job_id", jobId).eq("kind", "charge").eq("status", "succeeded").maybeSingle();
  if (!payment) throw new ActionError("No successful payment found for this job.");

  const processor = getPaymentProcessor();
  const refund = await processor.refund({ jobId, processorPaymentIntentId: payment.processor_payment_intent_id, amountCents: payment.amount_cents, reason });
  if (!refund.success) throw new ActionError(refund.failureReason ?? "Refund failed.");

  await admin.from("payments").update({ status: "refunded", refunded_cents: payment.amount_cents }).eq("id", payment.id);
  await admin.from("transactions").insert({ job_id: jobId, payment_id: payment.id, type: "refund", account: "customer", amount_cents: payment.amount_cents, description: reason || "Admin refund" });
  await admin.from("jobs").update({ status: "REFUNDED" }).eq("id", jobId);
  await admin.from("job_status_history").insert({ job_id: jobId, status: "REFUNDED", changed_by: null, note: reason });

  const { data: job } = await admin.from("jobs").select("customer_id, guy_id").eq("id", jobId).single();
  if (job?.customer_id) await notify(job.customer_id, "job_cancelled", "Refund issued", reason || "You've been refunded for this job.", { jobId });

  revalidatePath("/admin/jobs");
  revalidatePath("/admin/transactions");
  return { success: true };
}

export async function resolveDispute(jobId: string, resolution: string, action: "refund" | "release" | "dismiss") {
  await requireAdmin();
  const admin = createAdminClient();

  if (action === "refund") await adminRefundJob(jobId, resolution);
  else if (action === "release") {
    // "Release" means the Guy did the work and should be paid — mark the
    // job COMPLETED and run the exact same settlement (payout ledger,
    // provider_payouts row, notification) the normal guy-driven completion
    // flow runs. Previously this only flipped the status label, so the
    // Guy's payout was silently skipped for every dispute resolved this way.
    const { data: job } = await admin.from("jobs").update({ status: "COMPLETED" }).eq("id", jobId).select().maybeSingle();
    await admin.from("job_status_history").insert({ job_id: jobId, status: "COMPLETED", changed_by: null, note: resolution });
    if (job) await settleCompletedJob(admin, job as Job);
  } else {
    await admin.from("job_status_history").insert({ job_id: jobId, status: "DISPUTED", changed_by: null, note: `Dismissed: ${resolution}` });
  }
  revalidatePath("/admin/disputes");
  return { success: true };
}

export async function updateSupportTicket(id: string, status: "open" | "in_progress" | "resolved" | "closed") {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: ticket } = await admin.from("support_tickets").select("user_id").eq("id", id).single();
  const { error } = await admin.from("support_tickets").update({ status }).eq("id", id);
  if (error) throw new ActionError(error.message);
  if (ticket) await notify(ticket.user_id, "support_update", "Support ticket updated", `Your ticket status is now: ${status}`);
  revalidatePath("/admin/support");
  return { success: true };
}
