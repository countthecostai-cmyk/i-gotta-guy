import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type NotificationType =
  | "job_requested" | "job_matching" | "job_accepted" | "job_declined"
  | "job_scheduled" | "job_en_route" | "job_arrived" | "job_in_progress"
  | "job_completed" | "job_cancelled" | "payment_received" | "payout_sent"
  | "new_message" | "new_review" | "guy_approved" | "guy_rejected"
  | "support_update";

/**
 * Sends an in-app notification to a user. Server-only: notifications are
 * always authored by trusted server code, never directly by a client
 * (clients cannot INSERT into other users' notification rows — see RLS).
 *
 * This is the single fan-out point for the notification architecture. Email
 * / SMS / push can be added here later per `type` without touching callers.
 */
export async function notify(
  userId: string,
  type: NotificationType,
  title: string,
  body: string = "",
  data: Record<string, unknown> = {},
) {
  const admin = createAdminClient();
  const { error } = await admin.from("notifications").insert({ user_id: userId, type, title, body, data });
  if (error) console.error("notify() failed", { userId, type, error });
  // TODO: once email/SMS/push infra is configured, dispatch here based on
  // user notification preferences (not yet modeled — add a preferences
  // table before enabling additional channels).
}
