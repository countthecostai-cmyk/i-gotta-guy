import { redirect } from "next/navigation";
import { getGuyContext } from "../_lib/data";
import { ApplyForm } from "@/components/guy/apply-form";
import type { CategoryGroup } from "@/components/guy/apply-form";
import { Card } from "@/components/ui/primitives";

export default async function GuyApplyPage() {
  const { supabase, guyProfile } = await getGuyContext();

  // Already applied (in any state) — nothing left to do here.
  if (guyProfile) {
    redirect("/guy");
  }

  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").eq("active", true).order("sort_order"),
    supabase.from("services").select("id, category_id, name").eq("active", true).order("sort_order"),
  ]);

  const groups: CategoryGroup[] = (categories ?? []).map((c) => ({ id: c.id, name: c.name, services: [] }));
  const groupById = new Map(groups.map((g) => [g.id, g]));
  for (const s of services ?? []) {
    const group = groupById.get(s.category_id);
    if (!group) continue;
    group.services.push({ id: s.id, name: s.name });
  }
  const nonEmptyGroups = groups.filter((g) => g.services.length > 0);

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Become a Guy</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Takes two minutes. You&apos;re approved instantly — pick what you do below and you&apos;ll start showing
          up for matching jobs right away.
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <ApplyForm groups={nonEmptyGroups} />
      </Card>
    </div>
  );
}
