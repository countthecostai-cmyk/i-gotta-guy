"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { setAvailability } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { ErrorBanner, SuccessBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/primitives";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

interface SlotRow extends AvailabilitySlot {
  key: string;
}

function makeKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

export function AvailabilityForm({ initial }: { initial: AvailabilitySlot[] }) {
  const router = useRouter();
  const [slots, setSlots] = useState<SlotRow[]>(() => initial.map((s) => ({ ...s, key: makeKey() })));
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useServerAction(setAvailability);

  function updateSlot(key: string, patch: Partial<AvailabilitySlot>) {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function addSlot() {
    setSlots((prev) => [...prev, { key: makeKey(), dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }]);
  }
  function removeSlot(key: string) {
    setSlots((prev) => prev.filter((s) => s.key !== key));
  }

  async function handleSave() {
    setSaved(false);
    const result = await run({
      slots: slots.map(({ dayOfWeek, startTime, endTime }) => ({ dayOfWeek, startTime, endTime })),
    });
    if (result) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      <ErrorBanner message={error} />
      {saved && <SuccessBanner message="Availability saved." />}
      {slots.length === 0 && (
        <p className="text-sm text-ink-soft">No weekly hours set yet — add your first slot below.</p>
      )}
      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.key} className="flex flex-wrap items-center gap-2 rounded-xl border border-line p-2.5">
            <Select
              value={slot.dayOfWeek}
              onChange={(e) => updateSlot(slot.key, { dayOfWeek: Number(e.target.value) })}
              className="w-auto"
              aria-label="Day of week"
            >
              {DAYS.map((d, i) => (
                <option key={d} value={i}>
                  {d}
                </option>
              ))}
            </Select>
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(slot.key, { startTime: e.target.value })}
              aria-label="Start time"
              className="tap-target rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <span className="text-sm text-ink-soft">to</span>
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(slot.key, { endTime: e.target.value })}
              aria-label="End time"
              className="tap-target rounded-xl border border-line bg-paper-raised px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-brand/40"
            />
            <button
              type="button"
              onClick={() => removeSlot(slot.key)}
              className="tap-target ml-auto flex items-center justify-center text-ink-soft hover:text-danger"
              aria-label="Remove time slot"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={addSlot}>
          <Plus className="h-4 w-4" />
          Add time slot
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={handleSave} disabled={pending}>
          {pending ? "Saving…" : "Save availability"}
        </Button>
      </div>
    </div>
  );
}
