import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSafeInternalPath, roleHome } from "@/app/(auth)/_components/resolve-redirect";

/**
 * Call at the top of an auth page (login/signup) to send an already
 * signed-in user straight to their home surface instead of showing them
 * the auth form again. Without this, a logged-in user who lands on
 * /login or /signup (e.g. via a stale bookmark or back-button) sees a
 * confusing "log in again?" form instead of just continuing into the app.
 */
export async function redirectIfAuthenticated(next?: string | null, customerFallback: string = "/app") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  if (next && isSafeInternalPath(next)) redirect(next);

  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role === "admin" || data?.role === "guy") redirect(roleHome(data.role));
  redirect(customerFallback);
}
