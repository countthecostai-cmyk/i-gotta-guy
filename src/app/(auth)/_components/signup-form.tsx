"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { AuthCard, AuthError, AuthSuccess, RolePicker } from "@/app/(auth)/_components/auth-card";
import { isSafeInternalPath } from "@/app/(auth)/_components/resolve-redirect";

type Role = "customer" | "guy";

const COPY: Record<
  Role,
  { title: string; subtitle: string; cta: string; confirmMessage: string; redirect: (next: string | null) => string }
> = {
  customer: {
    title: "Create your account",
    subtitle: "Request your first service in minutes.",
    cta: "Create account",
    confirmMessage:
      "We sent a confirmation link to your email. Confirm your address, then log in to get started.",
    redirect: (next) => (next && isSafeInternalPath(next) ? next : "/app"),
  },
  guy: {
    title: "Apply to become a Guy",
    subtitle: "Set your services, area, and availability once you're approved.",
    cta: "Continue application",
    confirmMessage:
      "We sent a confirmation link to your email. Confirm your address, then log in to complete your Guy application.",
    redirect: () => "/guy",
  },
};

export function SignupForm({ role, next }: { role: Role; next: string | null }) {
  const router = useRouter();
  const copy = COPY[role];
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signUp({ email, password, fullName, role });
      if ("error" in result) {
        setError(result.error);
        return;
      }

      // If email confirmation is required, there's no active session yet —
      // show a "check your email" state instead of redirecting.
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        router.push(copy.redirect(next));
        router.refresh();
      } else {
        setConfirmed(true);
      }
    });
  }

  return (
    <AuthCard
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        <span className="text-ink-soft">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <RolePicker active={role} />
      {error && <AuthError message={error} />}
      {confirmed ? (
        <AuthSuccess message={copy.confirmMessage} />
      ) : (
        <form onSubmit={onSubmit} method="post" className="space-y-4" noValidate>
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-ink-soft">At least 8 characters.</p>
          </div>
          <Button type="submit" variant={role === "guy" ? "trust" : "primary"} size="lg" className="w-full" disabled={isPending}>
            {isPending ? "Creating account…" : copy.cta}
          </Button>
          <p className="text-center text-xs text-ink-soft">
            By continuing you agree to receive job-related communications from {role === "guy" ? "customers" : "your Guy"} and I Gotta Guy.
          </p>
        </form>
      )}
    </AuthCard>
  );
}
