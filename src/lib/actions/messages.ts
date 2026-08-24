"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notify } from "./notifications";
import { ActionError } from "./errors";

const schema = z.object({ jobId: z.string().uuid(), body: z.string().min(1).max(4000) });

/** Job-scoped messaging. RLS also enforces that sender/recipient are the job's two participants. */
export async function sendMessage(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");

  const { data: job } = await supabase.from("jobs").select("customer_id, guy_id").eq("id", parsed.jobId).single();
  if (!job) throw new ActionError("Job not found.");
  if (job.customer_id !== user.id && job.guy_id !== user.id) throw new ActionError("You're not part of this job.");
  if (!job.guy_id) throw new ActionError("No Guy is assigned to this job yet.");

  const recipientId = job.customer_id === user.id ? job.guy_id : job.customer_id;

  const { error } = await supabase.from("messages").insert({ job_id: parsed.jobId, sender_id: user.id, recipient_id: recipientId, body: parsed.body });
  if (error) throw new ActionError(error.message);

  await notify(recipientId, "new_message", "New message", parsed.body.slice(0, 140), { jobId: parsed.jobId });
  revalidatePath(`/app/jobs/${parsed.jobId}`);
  revalidatePath(`/guy/jobs/${parsed.jobId}`);
  return { success: true };
}

export async function markMessagesRead(jobId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("job_id", jobId).eq("recipient_id", user.id).is("read_at", null);
}
