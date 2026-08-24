import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/config";

const FOOTER_LINKS: { heading: string; links: { href: string; label: string }[] }[] = [
  {
    heading: "Get things done",
    links: [
      { href: "/services", label: "Browse services" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/signup", label: "Create an account" },
      { href: "/faq", label: "FAQ" },
    ],
  },
  {
    heading: "For Guys",
    links: [
      { href: "/become-a-guy", label: "Become a Guy" },
      { href: "/signup/guy", label: "Apply now" },
      { href: "/trust-safety", label: "Trust & safety" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/trust-safety", label: "Trust & safety" },
      { href: "/faq", label: "Support" },
      { href: "/login", label: "Log in" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper-raised">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="font-display text-lg font-extrabold tracking-tight text-ink">
              {SITE_NAME}
            </Link>
            <p className="mt-2 max-w-xs text-sm text-ink-soft">{SITE_TAGLINE}</p>
          </div>

          {FOOTER_LINKS.map((group) => (
            <div key={group.heading}>
              <h3 className="font-display text-sm font-semibold text-ink">{group.heading}</h3>
              <ul className="mt-3 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-ink-soft hover:text-ink">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-line pt-6 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</p>
          <p>Made for local service pros and the people who need them.</p>
        </div>
      </div>
    </footer>
  );
}
