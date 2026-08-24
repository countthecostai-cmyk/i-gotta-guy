"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ActionError } from "@/lib/actions/errors";

const schema = z.object({
  fullName: z.string().min(1, "Please enter your name.").max(120),
  phone: z.string().max(30).nullable().optional(),
});

/**
 * Customer self-service profile update. Scoped to the signed-in user only —
 * RLS additionally enforces `id = auth.uid()` on the `profiles` table, this
 * is the belt-and-suspenders server-side check.
 */
export async function updateMyProfile(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: parsed.fullName.trim(), phone: parsed.phone?.trim() || null })
    .eq("id", user.id);
  if (error) throw new ActionError(error.message);

  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { success: true };
}
