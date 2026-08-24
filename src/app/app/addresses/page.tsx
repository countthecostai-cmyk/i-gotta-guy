import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddressList } from "@/components/customer/address-list";

export const metadata = { title: "Your addresses" };

export default async function AddressesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/addresses");

  const { data: addresses } = await supabase
    .from("addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">Your addresses</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage the locations where you get work done.</p>
      </div>
      <AddressList addresses={addresses ?? []} />
    </div>
  );
}
