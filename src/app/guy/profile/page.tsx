import { redirect } from "next/navigation";
import { getGuyContext, guyStatusKind } from "../_lib/data";
import { ProfileBasicForm } from "@/components/guy/profile-basic-form";
import { ServicesManager, type CategoryGroup, type GuyServiceState } from "@/components/guy/services-manager";
import { ServiceAreaForm } from "@/components/guy/service-area-form";
import { AvailabilityForm, type AvailabilitySlot } from "@/components/guy/availability-form";
import { SignOutButton } from "@/components/guy/sign-out-button";
import { Card } from "@/components/ui/primitives";

export const metadata = { title: "Profile" };

export default async function GuyProfilePage() {
  const { supabase, user, profile, guyProfile } = await getGuyContext();
  const status = guyStatusKind(guyProfile);
  if (status === "none") redirect("/guy/apply");

  const canManageOperations = status === "pending" || status === "approved";

  const [{ data: categories }, { data: services }, { data: guyServiceRows }, { data: areaRows }, { data: availabilityRows }] =
    await Promise.all([
      canManageOperations
        ? supabase.from("service_categories").select("*").eq("active", true).order("sort_order")
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      canManageOperations
        ? supabase.from("services").select("*").eq("active", true).order("sort_order")
        : Promise.resolve({ data: [] as { id: string; category_id: string; name: string; pricing_model: string; base_price_cents: number; unit_label: string | null }[] }),
      canManageOperations
        ? supabase.from("guy_services").select("*").eq("guy_id", user!.id)
        : Promise.resolve({ data: [] as { service_id: string; active: boolean; custom_base_price_cents: number | null }[] }),
      canManageOperations
        ? supabase.from("guy_service_areas").select("*").eq("guy_id", user!.id).maybeSingle()
        : Promise.resolve({ data: null }),
      canManageOperations
        ? supabase.from("guy_availability").select("*").eq("guy_id", user!.id).order("day_of_week")
        : Promise.resolve({ data: [] as { day_of_week: number; start_time: string; end_time: string }[] }),
    ]);

  const groups: CategoryGroup[] = (categories ?? []).map((c) => ({ id: c.id, name: c.name, services: [] }));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  for (const s of services ?? []) {
    const group = groupById.get((s as { category_id: string }).category_id);
    if (!group) continue;
    group.services.push({
      id: s.id,
      name: s.name,
      pricing_model: s.pricing_model,
      base_price_cents: s.base_price_cents,
      unit_label: s.unit_label,
    });
  }

  const guyServiceState: Record<string, GuyServiceState> = {};
  for (const row of guyServiceRows ?? []) {
    guyServiceState[row.service_id] = { active: row.active, customBasePriceCents: row.custom_base_price_cents };
  }

  const areaInitial = areaRows
    ? {
        city: areaRows.city ?? "",
        state: areaRows.state ?? "",
        postalCode: areaRows.postal_code ?? "",
        radiusMiles: Number(areaRows.radius_miles),
      }
    : null;

  const availabilityInitial: AvailabilitySlot[] = (availabilityRows ?? []).map((r) => ({
    dayOfWeek: r.day_of_week,
    startTime: r.start_time.slice(0, 5),
    endTime: r.end_time.slice(0, 5),
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage how you show up to customers and what work you take.</p>
      </div>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-ink">About you</h2>
        <ProfileBasicForm
          initial={{
            fullName: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            bio: guyProfile?.bio ?? "",
            yearsExperience: guyProfile?.years_experience ?? null,
          }}
        />
      </Card>

      {canManageOperations && (
        <>
          <Card className="p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">Services you offer</h2>
            <p className="mb-4 mt-1 text-sm text-ink-soft">
              You&apos;ll see every open job either way — toggling a service on just moves those jobs to the top of
              your list.
            </p>
            <ServicesManager groups={groups} initial={guyServiceState} />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Service area</h2>
            <ServiceAreaForm initial={areaInitial} />
          </Card>

          <Card className="p-5 sm:p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-ink">Weekly availability</h2>
            <AvailabilityForm initial={availabilityInitial} />
          </Card>
        </>
      )}

      <Card className="flex items-center justify-between p-5 sm:p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Account</h2>
          <p className="text-sm text-ink-soft">Signed in — sign out of this device.</p>
        </div>
        <SignOutButton />
      </Card>
    </div>
  );
}
