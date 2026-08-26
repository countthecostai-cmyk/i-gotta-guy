"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthError } from "./auth-card";
import { isSafeInternalPath, roleHome } from "./resolve-redirect";

/**
 * Mounted on /login whenever the URL carries a magic-link `code` (the PKCE
 * authorization code Supabase's /verify endpoint issues after a valid,
 * unused, unexpired link is clicked). Exchanges it for a session using the
 * *browser* client so it shares the cookie jar the code verifier was
 * stashed in by sendMagicLink()'s server action — the same mechanism the
 * existing password-reset flow relies on (see reset-password-form.tsx).
 *
 * The destination is resolved from the newly-authenticated user's own
 * `profiles.role` row, never from anything in the URL, so this can't be
 * used to land a user on the wrong app surface or bypass authorization.
 */
export function MagicLinkCallback({ code, next }: { code: string; next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // StrictMode double-invoke / re-render guard — the code is single-use.
    ran.current = true;

    const supabase = createClient();
    let cancelled = false;

    (async () => {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (cancelled) return;
      if (exchangeError || !data.user) {
        setError("This sign-in link is invalid, expired, or has already been used. Request a new one below.");
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
      const role = profile?.role === "admin" || profile?.role === "guy" ? profile.role : "customer";
      const destination = next && isSafeInternalPath(next) ? next : roleHome(role);
      router.replace(destination);
      router.refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [code, next, router]);

  if (error) {
    return <AuthError message={error} />;
  }

  return (
    <div role="status" className="flex items-center gap-2 py-2 text-sm text-ink-soft">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      Signing you in…
    </div>
  );
}
