import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type GuyProfile = Database["public"]["Tables"]["guy_profiles"]["Row"];

/**
 * Fetches the signed-in user's profile + guy_profiles row once per request.
 * Wrapped in React's cache() so layout.tsx and every page.tsx under /guy can
 * call this without re-querying Supabase on every render.
 */
export const getGuyContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, profile: null as Profile | null, guyProfile: null as GuyProfile | null };
  }

  const [{ data: profile, error: profileErr }, { data: guyProfile, error: guyErr }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("guy_profiles").select("*").eq("id", user.id).maybeSingle(),
  ]);

  // A real DB error here must NOT be treated the same as "no guy_profile
  // row yet" — that silently bounced an approved Guy to the apply screen
  // during a transient outage. Throw so the nearest error.tsx handles it
  // distinctly instead of guyStatusKind() misreading it as status "none".
  if (profileErr) throw new Error(`Could not load your account: ${profileErr.message}`);
  if (guyErr) throw new Error(`Could not load your Guy profile: ${guyErr.message}`);

  return { supabase, user, profile: profile ?? null, guyProfile: guyProfile ?? null };
});

export type GuyStatusKind = "none" | "pending" | "approved" | "rejected" | "suspended";

export function guyStatusKind(guyProfile: GuyProfile | null): GuyStatusKind {
  if (!guyProfile) return "none";
  return guyProfile.status;
}

export const getUnreadNotificationCount = cache(async (userId: string) => {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
});
