"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Briefcase, Home, LifeBuoy, User, Wallet, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Icon *components* can't cross the Server → Client Component boundary as
// props (React can't serialize a function reference), so the server-rendered
// layout passes a plain icon *name* and this client module resolves it to
// the actual component locally.
const ICONS = { home: Home, briefcase: Briefcase, wallet: Wallet, user: User, "life-buoy": LifeBuoy, bell: Bell } satisfies Record<string, LucideIcon>;

export type GuyIconName = keyof typeof ICONS;

export interface GuyNavItem {
  href: string;
  label: string;
  icon: GuyIconName;
}

function isActive(pathname: string, href: string) {
  if (href === "/guy") return pathname === "/guy";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function GuyDesktopNav({ items }: { items: GuyNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-light text-brand-dark" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            {(() => { const Icon = ICONS[item.icon]; return <Icon className="h-4 w-4" />; })()}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function GuyMobileNav({ items }: { items: GuyNavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised/95 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-brand" : "text-ink-soft",
              )}
            >
              {(() => { const Icon = ICONS[item.icon]; return <Icon className="h-5 w-5" />; })()}
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
