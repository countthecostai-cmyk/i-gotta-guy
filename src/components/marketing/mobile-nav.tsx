"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LinkButton } from "@/components/marketing/link-button";
import { SITE_NAME } from "@/lib/config";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/become-a-guy", label: "Become A Guy" },
  { href: "/trust-safety", label: "Trust & Safety" },
  { href: "/faq", label: "FAQ" },
];

export function MobileNav({ isSignedIn }: { isSignedIn: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="tap-target inline-flex items-center justify-center rounded-full p-2 text-ink hover:bg-ink/5"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="relative ml-auto flex h-full w-full max-w-xs flex-col bg-paper-raised p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-display text-lg font-bold text-ink">{SITE_NAME}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="tap-target inline-flex items-center justify-center rounded-full p-2 text-ink hover:bg-ink/5"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="tap-target flex items-center rounded-xl px-3 py-3 text-[15px] font-medium text-ink hover:bg-ink/5"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              {isSignedIn ? (
                <LinkButton variant="primary" size="lg" className="w-full" href="/app" onClick={() => setOpen(false)}>
                  Go to my account
                </LinkButton>
              ) : (
                <>
                  <LinkButton variant="primary" size="lg" className="w-full" href="/signup" onClick={() => setOpen(false)}>
                    Get Started
                  </LinkButton>
                  <LinkButton variant="outline" size="lg" className="w-full" href="/login" onClick={() => setOpen(false)}>
                    Log in
                  </LinkButton>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
