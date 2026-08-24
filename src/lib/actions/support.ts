"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ActionError } from "./errors";

const schema = z.object({ subject: z.string().min(1).max(200), body: z.string().min(1).max(4000), jobId: z.string().uuid().nullable().optional() });

export async function createSupportTicket(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");
  const { error } = await supabase.from("support_tickets").insert({ user_id: user.id, subject: parsed.subject, body: parsed.body, job_id: parsed.jobId ?? null });
  if (error) throw new ActionError(error.message);
  revalidatePath("/app/support");
  revalidatePath("/guy/support");
  return { success: true };
}
