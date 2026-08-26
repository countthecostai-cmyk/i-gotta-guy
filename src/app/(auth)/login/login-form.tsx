"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, sendMagicLink } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { AuthCard, AuthError, AuthSuccess } from "@/app/(auth)/_components/auth-card";
import { MagicLinkCallback } from "@/app/(auth)/_components/magic-link-callback";
import { isSafeInternalPath, roleHome } from "@/app/(auth)/_components/resolve-redirect";

export function LoginForm({
  next,
  code,
  tokenHash,
}: {
  next: string | null;
  code: string | null;
  tokenHash: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Supabase redirects an expired/reused/invalid link's *own* verification
  // failure (not the code-exchange failure MagicLinkCallback handles) with
  // an `#error=...` URL fragment rather than a query param — fragments
  // never reach the server, so this can only be caught client-side. Only
  // relevant when we're not already handling a `code` (mutually exclusive:
  // Supabase's /verify redirects with either a code or a hash error, never
  // both).
  useEffect(() => {
    if (code || tokenHash) return;
    if (typeof window === "undefined" || !window.location.hash) return;
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    if (!params.get("error_description") && !params.get("error")) return;
    // Deferred rather than called synchronously in the effect body, to
    // match this codebase's established pattern for effect-driven auth
    // state (see the async exchange in reset-password-form.tsx).
    queueMicrotask(() => {
      setError("This sign-in link is invalid, expired, or has already been used. Request a new one below.");
      // Scrub the raw Supabase error text out of the address bar.
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    });
  }, [code, tokenHash]);

  function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn({ email, password });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const destination = next && isSafeInternalPath(next) ? next : roleHome(result.role);
      router.push(destination);
      router.refresh();
    });
  }

  function onSubmitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await sendMagicLink({ email, next: next ?? undefined });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setMagicSent(true);
    });
  }

  // A magic link brought the browser back here with a credential to
  // redeem — take over the whole card with the callback handler instead of
  // showing the form again.
  if (code || tokenHash) {
    return (
      <AuthCard title="Signing you in" subtitle="Just a moment.">
        <MagicLinkCallback code={code} tokenHash={tokenHash} next={next} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Log in"
      subtitle="Welcome back — pick up where you left off."
      footer={
        <span className="text-ink-soft">
          New here?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      {error && <AuthError message={error} />}

      {mode === "magic" ? (
        magicSent ? (
          <AuthSuccess
            message={`If an account exists for ${email}, we've sent a sign-in link — it works once and expires soon, so use it right away.`}
          />
        ) : (
          <form onSubmit={onSubmitMagicLink} method="post" className="space-y-4" noValidate>
            <div>
              <Label htmlFor="magic-email">Email</Label>
              <Input
                id="magic-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="mt-1.5 text-xs text-ink-soft">We&apos;ll email you a link — no password needed.</p>
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Sending…" : "Email me a sign-in link"}
            </Button>
            <button
              type="button"
              onClick={() => {
                setMode("password");
                setError(null);
              }}
              className="tap-target w-full text-center text-sm font-medium text-brand hover:underline"
            >
              Use a password instead
            </button>
          </form>
        )
      ) : (
        <>
          <form onSubmit={onSubmitPassword} method="post" className="space-y-4" noValidate>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="mb-0">
                  Password
                </Label>
                <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-brand hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={isPending}>
              {isPending ? "Logging in…" : "Log in"}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => {
              setMode("magic");
              setError(null);
            }}
            className="tap-target mt-4 w-full text-center text-sm font-medium text-brand hover:underline"
          >
            Email me a sign-in link instead
          </button>
        </>
      )}
    </AuthCard>
  );
}
