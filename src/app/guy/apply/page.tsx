import { redirect } from "next/navigation";
import { getGuyContext } from "../_lib/data";
import { ApplyForm } from "@/components/guy/apply-form";
import { Card } from "@/components/ui/primitives";

export default async function GuyApplyPage() {
  const { guyProfile } = await getGuyContext();

  // Already applied (in any state) — nothing left to do here.
  if (guyProfile) {
    redirect("/guy");
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Apply to become a Guy</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Takes two minutes. Once you submit, our team reviews your application before you can start accepting jobs.
        </p>
      </div>
      <Card className="p-6 sm:p-8">
        <ApplyForm />
      </Card>
    </div>
  );
}
