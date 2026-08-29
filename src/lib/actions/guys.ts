"use server";

import { z } from "zod";
import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SITE_URL } from "@/lib/config";
import { ActionError } from "./errors";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");
  return { supabase, user };
}

const applySchema = z.object({
  bio: z.string().max(2000).default(""),
  yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
  serviceIds: z.array(z.string().uuid()).min(1, "Pick at least one service you offer."),
});

/**
 * Apply to become a Guy. Approval is instant — no admin review gate — so a
 * new applicant can start seeing and accepting jobs immediately. Trust &
 * safety enforcement (identity verification, background-check status,
 * suspension, rejection for cause) is handled separately and doesn't block
 * this initial step; `guy_profiles.status` still supports "pending" for any
 * future manual-review path, and admins can still suspend/reject an
 * already-approved Guy at any time.
 *
 * Selecting at least one service here (not just approving the account) is
 * what actually makes a new Guy "on the lookout for jobs" — `guy_services`
 * rows require an existing `guy_profiles` row (FK), so they can only be
 * created after this upsert, in the same action, not via the reusable
 * `ServicesManager` component (which persists one row per click and is
 * meant for the profile page after a Guy already exists).
 */
export async function applyToBecomeGuy(input: z.infer<typeof applySchema>) {
  const parsed = applySchema.parse(input);
  const { supabase, user } = await requireUser();

  await supabase.from("profiles").update({ role: "guy" }).eq("id", user.id);

  const { error } = await supabase.from("guy_profiles").upsert(
    {
      id: user.id,
      status: "approved",
      bio: parsed.bio,
      years_experience: parsed.yearsExperience ?? null,
      approved_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new ActionError(error.message);

  // Validate the chosen service ids are real, active services before
  // enrolling — a client could otherwise submit arbitrary uuids.
  const { data: validServices, error: servicesErr } = await supabase
    .from("services")
    .select("id")
    .eq("active", true)
    .in("id", parsed.serviceIds);
  if (servicesErr) throw new ActionError(servicesErr.message);
  const validIds = new Set((validServices ?? []).map((s) => s.id));
  const rows = parsed.serviceIds.filter((id) => validIds.has(id)).map((serviceId) => ({ guy_id: user.id, service_id: serviceId, active: true }));

  if (rows.length > 0) {
    const { error: gsError } = await supabase.from("guy_services").upsert(rows, { onConflict: "guy_id,service_id" });
    if (gsError) throw new ActionError(gsError.message);
  }

  revalidatePath("/guy");
  revalidatePath("/guy/profile");
  return { success: true };
}

const servicesSchema = z.object({
  serviceId: z.string().uuid(),
  active: z.boolean(),
  customBasePriceCents: z.number().int().positive().nullable().optional(),
});

export async function setGuyService(input: z.infer<typeof servicesSchema>) {
  const parsed = servicesSchema.parse(input);
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("guy_services").upsert(
    { guy_id: user.id, service_id: parsed.serviceId, active: parsed.active, custom_base_price_cents: parsed.customBasePriceCents ?? null },
    { onConflict: "guy_id,service_id" },
  );
  if (error) throw new ActionError(error.message);
  revalidatePath("/guy/profile");
  return { success: true };
}

const areaSchema = z.object({
  centerLat: z.number(), centerLng: z.number(), radiusMiles: z.number().positive().max(100),
  city: z.string().optional(), state: z.string().optional(), postalCode: z.string().optional(),
});

export async function setServiceArea(input: z.infer<typeof areaSchema>) {
  const parsed = areaSchema.parse(input);
  const { supabase, user } = await requireUser();
  await supabase.from("guy_service_areas").delete().eq("guy_id", user.id);
  const { error } = await supabase.from("guy_service_areas").insert({
    guy_id: user.id, center_lat: parsed.centerLat, center_lng: parsed.centerLng, radius_miles: parsed.radiusMiles,
    city: parsed.city, state: parsed.state, postal_code: parsed.postalCode,
  });
  if (error) throw new ActionError(error.message);
  revalidatePath("/guy/profile");
  return { success: true };
}

const availabilitySchema = z.object({
  slots: z.array(z.object({ dayOfWeek: z.number().int().min(0).max(6), startTime: z.string(), endTime: z.string() })),
});

export async function setAvailability(input: z.infer<typeof availabilitySchema>) {
  const parsed = availabilitySchema.parse(input);
  const { supabase, user } = await requireUser();
  await supabase.from("guy_availability").delete().eq("guy_id", user.id);
  if (parsed.slots.length) {
    const { error } = await supabase.from("guy_availability").insert(
      parsed.slots.map((s) => ({ guy_id: user.id, day_of_week: s.dayOfWeek, start_time: s.startTime, end_time: s.endTime })),
    );
    if (error) throw new ActionError(error.message);
  }
  revalidatePath("/guy/profile");
  return { success: true };
}

export async function togglePauseAvailability(isAvailable: boolean) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("guy_profiles").update({ is_available: isAvailable }).eq("id", user.id);
  if (error) throw new ActionError(error.message);
  revalidatePath("/guy");
  return { success: true };
}

export async function updateGuyProfile(input: { bio?: string; yearsExperience?: number | null; fullName?: string; phone?: string }) {
  const { supabase, user } = await requireUser();
  if (input.fullName !== undefined || input.phone !== undefined) {
    await supabase.from("profiles").update({ ...(input.fullName !== undefined ? { full_name: input.fullName } : {}), ...(input.phone !== undefined ? { phone: input.phone } : {}) }).eq("id", user.id);
  }
  if (input.bio !== undefined || input.yearsExperience !== undefined) {
    await supabase.from("guy_profiles").update({ ...(input.bio !== undefined ? { bio: input.bio } : {}), ...(input.yearsExperience !== undefined ? { years_experience: input.yearsExperience } : {}) }).eq("id", user.id);
  }
  revalidatePath("/guy/profile");
  return { success: true };
}

/**
 * Creates (or reuses) this Guy's Stripe Connect Express account and returns
 * a fresh onboarding-link URL to redirect them to. Standard Connect Express
 * account + Account Links onboarding — the classic, fully-supported hosted
 * flow, chosen deliberately over Stripe's newer embedded-components pattern
 * (which needs @stripe/connect-js wired into the UI) since this integration
 * has to work correctly on the first real transaction with no test-mode
 * environment available to iterate in. `stripe_payouts_enabled` gets kept
 * in sync separately by the `account.updated` webhook once onboarding
 * actually completes — this action only guarantees an account id exists.
 */
export async function createGuyPayoutOnboardingLink() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new ActionError("Payouts aren't configured yet — check back soon.");

  const { supabase, user } = await requireUser();
  const admin = createAdminClient();

  const { data: guyProfile } = await supabase
    .from("guy_profiles")
    .select("id, status, stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!guyProfile || guyProfile.status !== "approved") throw new ActionError("You need to be an approved Guy first.");

  const stripe = new Stripe(secretKey, { apiVersion: "2026-07-29.dahlia" as Stripe.LatestApiVersion });

  let accountId = guyProfile.stripe_connect_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_type: "individual",
      metadata: { guy_id: user.id },
    });
    accountId = account.id;
    const { error } = await admin.from("guy_profiles").update({ stripe_connect_account_id: accountId }).eq("id", user.id);
    if (error) throw new ActionError("Couldn't start payout setup. Please try again.");
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${SITE_URL}/guy/earnings?payouts=refresh`,
    return_url: `${SITE_URL}/guy/earnings?payouts=return`,
  });

  return { url: link.url };
}
