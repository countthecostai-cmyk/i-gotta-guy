"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { setGuyService } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { formatCents, toCents } from "@/lib/domain/money";
import { Input } from "@/components/ui/primitives";

export interface ServiceOption {
  id: string;
  name: string;
  pricing_model: string;
  base_price_cents: number;
  unit_label: string | null;
}

export interface CategoryGroup {
  id: string;
  name: string;
  services: ServiceOption[];
}

export interface GuyServiceState {
  active: boolean;
  customBasePriceCents: number | null;
}

export function ServicesManager({
  groups,
  initial,
}: {
  groups: CategoryGroup[];
  initial: Record<string, GuyServiceState>;
}) {
  if (groups.every((g) => g.services.length === 0)) {
    return <p className="text-sm text-ink-soft">No services are available to offer yet.</p>;
  }
  return (
    <div className="space-y-6">
      {groups.map(
        (group) =>
          group.services.length > 0 && (
            <div key={group.id}>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">{group.name}</h3>
              <div className="space-y-2">
                {group.services.map((service) => (
                  <ServiceRow key={service.id} service={service} initial={initial[service.id]} />
                ))}
              </div>
            </div>
          ),
      )}
    </div>
  );
}

function ServiceRow({ service, initial }: { service: ServiceOption; initial?: GuyServiceState }) {
  const router = useRouter();
  const [active, setActive] = useState(initial?.active ?? false);
  const [price, setPrice] = useState(
    initial?.customBasePriceCents != null ? (initial.customBasePriceCents / 100).toString() : "",
  );
  const { run, pending, error } = useServerAction(setGuyService);

  async function toggle(nextActive: boolean) {
    const previousActive = active;
    setActive(nextActive);
    const customBasePriceCents = price.trim() ? toCents(Number(price)) : null;
    const result = await run({ serviceId: service.id, active: nextActive, customBasePriceCents });
    if (result) {
      router.refresh();
    } else {
      // Save failed — roll back the optimistic toggle so the checkbox
      // doesn't show a state that was never actually persisted.
      setActive(previousActive);
    }
  }

  async function savePrice() {
    const customBasePriceCents = price.trim() ? toCents(Number(price)) : null;
    const result = await run({ serviceId: service.id, active, customBasePriceCents });
    if (result) router.refresh();
  }

  return (
    <div className="rounded-xl border border-line p-3">
      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="flex-1 text-sm font-medium text-ink">
          {service.name}
          <span className="ml-2 text-xs font-normal text-ink-soft">
            default {formatCents(service.base_price_cents)}
            {service.unit_label ? ` ${service.unit_label}` : ""}
          </span>
        </span>
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => toggle(e.target.checked)}
          disabled={pending}
          className="h-5 w-5 shrink-0 rounded border-line text-brand focus:ring-brand"
        />
      </label>
      {active && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-ink-soft">Your price override</span>
          <div className="relative w-28">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-soft">$</span>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="h-8 pl-6 text-sm"
              placeholder="default"
            />
          </div>
          <button
            type="button"
            onClick={savePrice}
            disabled={pending}
            className="tap-target flex items-center justify-center rounded-full text-xs font-medium text-brand hover:bg-brand-light"
            aria-label="Save price"
          >
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
      <ErrorBanner message={error} className="mt-2" />
    </div>
  );
}
