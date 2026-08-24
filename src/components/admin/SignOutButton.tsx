"use client";

import * as React from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/lib/actions/auth";

export function SignOutButton() {
  const [pending, startTransition] = React.useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signOut())}
      className="tap-target flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-ink-soft hover:bg-ink/5 hover:text-ink disabled:opacity-50"
    >
      <LogOut size={16} />
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
