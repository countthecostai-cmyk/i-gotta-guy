"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
});

/** Apply to become a Guy. Creates a pending guy_profiles row for admin review. */
export async function applyToBecomeGuy(input: z.infer<typeof applySchema>) {
  const parsed = applySchema.parse(input);
  const { supabase, user } = await requireUser();

  await supabase.from("profiles").update({ role: "guy" }).eq("id", user.id);

  const { error } = await supabase.from("guy_profiles").upsert(
    { id: user.id, status: "pending", bio: parsed.bio, years_experience: parsed.yearsExperience ?? null },
    { onConflict: "id" },
  );
  if (error) throw new ActionError(error.message);

  revalidatePath("/guy");
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
