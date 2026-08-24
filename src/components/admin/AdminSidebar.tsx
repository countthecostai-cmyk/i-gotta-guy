"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Wrench,
  Percent,
  Tag,
  ClipboardList,
  Receipt,
  ShieldAlert,
  Star,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_NAV: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
}> = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/guys", label: "Guys", icon: UserCog },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/services", label: "Services", icon: Wrench },
  { href: "/admin/fees", label: "Fees", icon: Percent },
  { href: "/admin/promotions", label: "Promotions", icon: Tag },
  { href: "/admin/jobs", label: "Jobs", icon: ClipboardList },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/disputes", label: "Disputes", icon: ShieldAlert },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/support", label: "Support", icon: LifeBuoy },
];

export function AdminSidebar({ badges }: { badges: Partial<Record<string, number>> }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-0.5 p-3">
      {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
        const isActive = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
        const count = badges[label];
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "tap-target flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive ? "bg-brand text-white" : "text-ink-soft hover:bg-ink/5 hover:text-ink",
            )}
          >
            <Icon className="h-4.5 w-4.5 shrink-0" size={18} />
            <span className="flex-1">{label}</span>
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
