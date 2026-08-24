import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Privileged Supabase client using the SERVICE ROLE key. Bypasses RLS.
 *
 * NEVER import this into a Client Component or expose it to the browser.
 * The `server-only` import above makes any accidental client-side import a
 * build error. Use this only in Route Handlers / Server Actions for
 * operations that legitimately need to cross RLS boundaries:
 *   - writing payment/transaction/payout ledger rows
 *   - sending notifications to another user
 *   - server-side matching queries
 *
 * Every use of this client MUST perform its own authorization check first —
 * it does not get a free pass just because RLS is bypassed.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
