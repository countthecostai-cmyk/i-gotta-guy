"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ActionError } from "./errors";

const addressSchema = z.object({
  label: z.string().max(60).default("Home"),
  line1: z.string().min(3).max(200),
  line2: z.string().max(200).nullable().optional(),
  city: z.string().min(1).max(120),
  state: z.string().min(1).max(60),
  postalCode: z.string().min(3).max(20),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isDefault: z.boolean().default(false),
});

export async function addAddress(input: z.infer<typeof addressSchema>) {
  const parsed = addressSchema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");

  if (parsed.isDefault) await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);

  const { data, error } = await supabase
    .from("addresses")
    .insert({ user_id: user.id, label: parsed.label, line1: parsed.line1, line2: parsed.line2 ?? null, city: parsed.city, state: parsed.state, postal_code: parsed.postalCode, lat: parsed.lat ?? null, lng: parsed.lng ?? null, is_default: parsed.isDefault })
    .select()
    .single();
  if (error) throw new ActionError(error.message);
  revalidatePath("/app/addresses");
  return data;
}

export async function deleteAddress(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");
  const { error } = await supabase.from("addresses").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new ActionError(error.message);
  revalidatePath("/app/addresses");
  return { success: true };
}

export async function setDefaultAddress(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");
  await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id).eq("user_id", user.id);
  if (error) throw new ActionError(error.message);
  revalidatePath("/app/addresses");
  return { success: true };
}
