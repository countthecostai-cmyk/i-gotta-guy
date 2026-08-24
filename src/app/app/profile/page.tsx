import Link from "next/link";
import { redirect } from "next/navigation";
import { LifeBuoy, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/primitives";
import { ProfileForm } from "@/components/customer/profile-form";
import { SignOutButton } from "@/components/customer/sign-out-button";

export const metadata = { title: "Your profile" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/profile");

  const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Your profile</h1>
        <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
      </div>

      <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? null} />

      <Link href="/app/support">
        <Card className="flex items-center justify-between gap-3 p-4 hover:border-brand">
          <span className="flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 text-ink-soft" />
            <span className="text-sm font-medium text-ink">Help & support</span>
          </span>
          <ChevronRight className="h-4 w-4 text-ink-soft" />
        </Card>
      </Link>

      <SignOutButton />
    </div>
  );
}
