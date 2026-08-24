import Link from "next/link";
import { isSupabaseConfigured, SITE_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { LinkButton } from "@/components/marketing/link-button";
import { MobileNav } from "@/components/marketing/mobile-nav";

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/become-a-guy", label: "Become A Guy" },
  { href: "/trust-safety", label: "Trust & Safety" },
  { href: "/faq", label: "FAQ" },
];

async function getIsSignedIn() {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function SiteHeader() {
  const isSignedIn = await getIsSignedIn();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
          {SITE_NAME}
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="tap-target rounded-full px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isSignedIn ? (
            <LinkButton href="/app" variant="primary" size="sm">
              Go to my account
            </LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" size="sm">
                Log in
              </LinkButton>
              <LinkButton href="/signup" variant="primary" size="sm">
                Get Started
              </LinkButton>
            </>
          )}
        </div>

        <MobileNav isSignedIn={isSignedIn} />
      </div>
    </header>
  );
}
