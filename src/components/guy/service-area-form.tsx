"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setServiceArea } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { ErrorBanner, SuccessBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";

export interface ServiceAreaInitial {
  city: string;
  state: string;
  postalCode: string;
  radiusMiles: number;
}

export function ServiceAreaForm({ initial }: { initial: ServiceAreaInitial | null }) {
  const router = useRouter();
  const [city, setCity] = useState(initial?.city ?? "");
  const [state, setState] = useState(initial?.state ?? "");
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? "");
  const [radius, setRadius] = useState(String(initial?.radiusMiles ?? 15));
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useServerAction(setServiceArea);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const result = await run({
      centerLat: 0,
      centerLng: 0,
      radiusMiles: Number(radius) || 15,
      city: city.trim() || undefined,
      state: state.trim() || undefined,
      postalCode: postalCode.trim() || undefined,
    });
    if (result) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorBanner message={error} />
      {saved && <SuccessBanner message="Service area saved." />}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="area-city">City</Label>
          <Input id="area-city" value={city} onChange={(e) => setCity(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="area-state">State</Label>
          <Input id="area-state" value={state} onChange={(e) => setState(e.target.value)} maxLength={2} />
        </div>
        <div>
          <Label htmlFor="area-postal">ZIP code</Label>
          <Input id="area-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="area-radius">Radius (miles)</Label>
          <Input
            id="area-radius"
            type="number"
            min={1}
            max={100}
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        We use your city/ZIP and radius to match you with nearby jobs. Precise map-based service areas are a
        planned improvement — geocoding isn&apos;t wired up yet.
      </p>
      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "Saving…" : "Save service area"}
      </Button>
    </form>
  );
}
