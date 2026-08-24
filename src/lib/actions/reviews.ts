"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "./notifications";
import { ActionError } from "./errors";

const schema = z.object({
  jobId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).default(""),
});

/** Either party on a COMPLETED job can rate the other, once. */
export async function submitReview(input: z.infer<typeof schema>) {
  const parsed = schema.parse(input);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new ActionError("You must be signed in.");

  const { data: job } = await supabase.from("jobs").select("id, customer_id, guy_id, status").eq("id", parsed.jobId).single();
  if (!job) throw new ActionError("Job not found.");
  if (!["COMPLETED", "PAYOUT_PENDING", "PAYOUT_COMPLETED"].includes(job.status)) {
    throw new ActionError("You can review once the job is complete.");
  }
  if (job.customer_id !== user.id && job.guy_id !== user.id) throw new ActionError("You weren't part of this job.");

  const targetId = job.customer_id === user.id ? job.guy_id : job.customer_id;
  if (!targetId) throw new ActionError("No one to review on this job.");

  const admin = createAdminClient();
  const { error } = await admin.from("reviews").insert({ job_id: parsed.jobId, author_id: user.id, target_id: targetId, rating: parsed.rating, comment: parsed.comment });
  if (error) {
    if (error.code === "23505") throw new ActionError("You already reviewed this job.");
    throw new ActionError(error.message);
  }

  // Recompute the target's aggregate rating if they're a Guy.
  const { data: guy } = await admin.from("guy_profiles").select("id").eq("id", targetId).maybeSingle();
  if (guy) {
    const { data: allReviews } = await admin.from("reviews").select("rating").eq("target_id", targetId);
    const ratings = (allReviews ?? []).map((r) => r.rating);
    const avg = ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
    await admin.from("guy_profiles").update({ avg_rating: avg, rating_count: ratings.length }).eq("id", targetId);
  }

  await notify(targetId, "new_review", "You received a review", parsed.comment || `${parsed.rating}-star rating`, { jobId: parsed.jobId });
  revalidatePath(`/app/jobs/${parsed.jobId}`);
  revalidatePath(`/guy/jobs/${parsed.jobId}`);
  return { success: true };
}
