import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/primitives";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-8">
      <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>}
      <div className="mt-6">{children}</div>
      {footer && <div className="mt-6 border-t border-line pt-5 text-center text-sm">{footer}</div>}
    </Card>
  );
}

export function AuthError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-danger-light bg-danger-light/60 px-4 py-3 text-sm font-medium text-danger"
    >
      {message}
    </div>
  );
}

export function AuthSuccess({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="mb-4 rounded-xl border border-trust-light bg-trust-light/60 px-4 py-3 text-sm font-medium text-trust-dark"
    >
      {message}
    </div>
  );
}

export function RolePicker({ active }: { active: "customer" | "guy" }) {
  return (
    <div
      className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-line bg-paper p-1 text-sm font-medium"
      role="tablist"
      aria-label="I want to"
    >
      <Link
        href="/signup"
        role="tab"
        aria-selected={active === "customer"}
        className={
          "tap-target flex items-center justify-center rounded-full px-3 py-2 transition-colors " +
          (active === "customer" ? "bg-brand text-white" : "text-ink-soft hover:text-ink")
        }
      >
        Get something done
      </Link>
      <Link
        href="/signup/guy"
        role="tab"
        aria-selected={active === "guy"}
        className={
          "tap-target flex items-center justify-center rounded-full px-3 py-2 transition-colors " +
          (active === "guy" ? "bg-trust text-white" : "text-ink-soft hover:text-ink")
        }
      >
        Become a Guy
      </Link>
    </div>
  );
}
