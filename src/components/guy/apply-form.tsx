"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyToBecomeGuy } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Label, Textarea, Input } from "@/components/ui/primitives";

export interface ServiceOption {
  id: string;
  name: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  services: ServiceOption[];
}

export function ApplyForm({ groups }: { groups: CategoryGroup[] }) {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [serviceIds, setServiceIds] = useState<Set<string>>(new Set());
  const [servicesTouched, setServicesTouched] = useState(false);
  const { run, pending, error } = useServerAction(applyToBecomeGuy);

  function toggleService(id: string) {
    setServicesTouched(true);
    setServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServicesTouched(true);
    if (serviceIds.size === 0) return;
    const result = await run({
      bio,
      yearsExperience: years.trim() === "" ? null : Number(years),
      serviceIds: [...serviceIds],
    });
    if (result) router.push("/guy");
  }

  const showServicesError = servicesTouched && serviceIds.size === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <ErrorBanner message={error} />
      <div>
        <Label htmlFor="bio">Tell customers about yourself</Label>
        <Textarea
          id="bio"
          rows={5}
          maxLength={2000}
          placeholder="What kind of work do you do? What makes you reliable? Any experience worth mentioning?"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />
        <p className="mt-1 text-xs text-ink-soft">This shows up on your public profile once you&apos;re approved.</p>
      </div>
      <div>
        <Label htmlFor="years">Years of relevant experience</Label>
        <Input
          id="years"
          type="number"
          min={0}
          max={80}
          placeholder="e.g. 5"
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="max-w-[160px]"
        />
      </div>

      <div>
        <Label htmlFor="services">What do you do?</Label>
        <p className="mb-2 text-xs text-ink-soft">
          Pick at least one — you&apos;ll only be matched with jobs for the services you select. You can add more
          any time from your profile.
        </p>
        {groups.length === 0 ? (
          <p className="text-sm text-ink-soft">No services are available to offer yet.</p>
        ) : (
          <div id="services" className="space-y-4">
            {groups.map((group) => (
              <div key={group.id}>
                <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-soft">{group.name}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.services.map((service) => {
                    const active = serviceIds.has(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => toggleService(service.id)}
                        aria-pressed={active}
                        className={`tap-target rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                          active
                            ? "border-brand bg-brand-light text-brand-dark"
                            : "border-line bg-transparent text-ink-soft hover:bg-ink/5"
                        }`}
                      >
                        {service.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        {showServicesError && <p className="mt-2 text-sm text-danger">Pick at least one service you offer.</p>}
      </div>

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Become a Guy"}
      </Button>
    </form>
  );
}
