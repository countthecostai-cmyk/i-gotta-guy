import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Defense-in-depth admin check for Server Components under /admin.
 * Middleware already redirects non-admins away from /admin, but every
 * privileged read in this area re-verifies the role via the RLS-respecting
 * client before touching the service-role admin client.
 */
export async function requireAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/app");

  return {
    user,
    profile,
    admin: createAdminClient(),
  };
}
