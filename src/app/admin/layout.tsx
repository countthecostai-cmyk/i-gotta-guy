import Link from "next/link";
import { requireAdminContext } from "./_lib/require-admin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { initials } from "./_lib/format";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile, admin } = await requireAdminContext();

  const [{ count: pendingGuys }, { count: openDisputes }, { count: openTickets }] = await Promise.all([
    admin.from("guy_profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    admin.from("jobs").select("id", { count: "exact", head: true }).eq("status", "DISPUTED"),
    admin.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
  ]);

  const badges: Partial<Record<string, number>> = {
    Guys: pendingGuys ?? 0,
    Disputes: openDisputes ?? 0,
    Support: openTickets ?? 0,
  };

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-paper-raised md:flex">
        <Link href="/admin" className="flex items-center gap-2 border-b border-line px-5 py-5">
          <span className="font-display text-lg font-bold text-ink">I Gotta Guy</span>
        </Link>
        <div className="flex-1 overflow-y-auto">
          <AdminSidebar badges={badges} />
        </div>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-light text-sm font-semibold text-brand-dark">
              {initials(profile?.full_name || "Admin")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{profile?.full_name || "Admin"}</p>
              <p className="text-xs text-ink-soft">Administrator</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-line bg-paper-raised px-4 py-3 md:hidden">
          <Link href="/admin" className="font-display text-base font-bold text-ink">
            I Gotta Guy — Admin
          </Link>
          <SignOutButton />
        </header>
        <div className="border-b border-line bg-paper-raised md:hidden">
          <AdminMobileNav badges={badges} />
        </div>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
