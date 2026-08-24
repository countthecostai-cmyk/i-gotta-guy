import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { getGuyContext, getUnreadNotificationCount, guyStatusKind } from "./_lib/data";
import { GuyDesktopNav, GuyMobileNav, type GuyNavItem } from "@/components/guy/guy-nav";
import { AvailabilityToggle } from "@/components/guy/availability-toggle";
import { SignOutButton } from "@/components/guy/sign-out-button";
import { Badge } from "@/components/ui/primitives";

// Icon *names* only — see the comment in guy-nav.tsx for why the actual
// icon components can't be passed as props from this Server Component.
const APPROVED_NAV: GuyNavItem[] = [
  { href: "/guy", label: "Home", icon: "home" },
  { href: "/guy/jobs", label: "Jobs", icon: "briefcase" },
  { href: "/guy/earnings", label: "Earnings", icon: "wallet" },
  { href: "/guy/profile", label: "Profile", icon: "user" },
  { href: "/guy/support", label: "Support", icon: "life-buoy" },
];

const LIMITED_NAV: GuyNavItem[] = [
  { href: "/guy/profile", label: "Profile", icon: "user" },
  { href: "/guy/support", label: "Support", icon: "life-buoy" },
];

export default async function GuyLayout({ children }: { children: React.ReactNode }) {
  const { user, guyProfile } = await getGuyContext();

  if (!user) {
    redirect("/login?next=/guy");
  }

  const status = guyStatusKind(guyProfile);
  const navItems = status === "approved" ? APPROVED_NAV : status === "none" ? [] : LIMITED_NAV;
  const unreadCount = status === "none" ? 0 : await getUnreadNotificationCount(user.id);

  return (
    <div className="min-h-dvh bg-paper pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/guy" className="font-display text-lg font-bold text-ink">
            I Gotta <span className="text-brand">Guy</span>
          </Link>

          <GuyDesktopNav items={navItems} />

          <div className="flex items-center gap-2">
            {status === "approved" && (
              <>
                <AvailabilityToggle isAvailable={guyProfile?.is_available ?? true} />
                <Link
                  href="/guy"
                  className="tap-target relative inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-ink/5"
                  aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : "Notifications"}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge
                      variant="brand"
                      className="absolute -right-0.5 -top-0.5 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </Badge>
                  )}
                </Link>
              </>
            )}
            <SignOutButton />
          </div>
        </div>
        {status === "pending" && (
          <div className="border-t border-line bg-brand-light px-4 py-2 text-center text-sm font-medium text-brand-dark">
            Your Guy application is under review. We&apos;ll let you know as soon as it&apos;s decided.
          </div>
        )}
        {status === "rejected" && (
          <div className="border-t border-line bg-danger-light px-4 py-2 text-center text-sm font-medium text-danger">
            Your application wasn&apos;t approved. Contact support if you have questions.
          </div>
        )}
        {status === "suspended" && (
          <div className="border-t border-line bg-danger-light px-4 py-2 text-center text-sm font-medium text-danger">
            Your account is suspended and can&apos;t accept jobs right now.
          </div>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>

      {navItems.length > 0 && <GuyMobileNav items={navItems} />}
    </div>
  );
}
