"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ADMIN_NAV } from "./AdminSidebar";

/** Horizontal scrollable nav for small/tablet screens. */
export function AdminMobileNav({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1.5 overflow-x-auto px-2 py-2">
      {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        const count = badges[label];
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "tap-target flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
              isActive ? "bg-brand text-white" : "bg-ink/5 text-ink-soft hover:text-ink",
            )}
          >
            <Icon size={15} />
            {label}
            {!!count && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                  isActive ? "bg-white/20 text-white" : "bg-danger-light text-danger",
                )}
              >
                {count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
