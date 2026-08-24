"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, ClipboardList, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "./notification-bell";

const NAV_ITEMS = [
  { href: "/app", label: "Home", icon: Home, match: (p: string) => p === "/app" },
  { href: "/app/jobs", label: "Jobs", icon: ClipboardList, match: (p: string) => p.startsWith("/app/jobs") },
  { href: "/app/addresses", label: "Addresses", icon: MapPin, match: (p: string) => p.startsWith("/app/addresses") },
  { href: "/app/profile", label: "Profile", icon: User, match: (p: string) => p.startsWith("/app/profile") },
];

export function AppShell({
  fullName,
  unreadCount,
  children,
}: {
  fullName: string;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const firstName = fullName.trim().split(" ")[0] || "there";

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/app" className="flex items-center gap-2">
            <span className="font-display text-lg font-extrabold text-ink">
              I Gotta <span className="text-brand">Guy</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 md:flex">
              {NAV_ITEMS.map((item) => {
                const active = item.match(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                      active ? "bg-brand-light text-brand-dark" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <NotificationBell initialUnreadCount={unreadCount} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-5 md:pb-10">
        <p className="mb-4 hidden text-sm text-ink-soft md:block">Hey {firstName}, what can we help with today?</p>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised/95 backdrop-blur supports-[backdrop-filter]:bg-paper-raised/85 md:hidden">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)]">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "tap-target flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium",
                  active ? "text-brand" : "text-ink-soft",
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-brand-light")} strokeWidth={active ? 2.5 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
