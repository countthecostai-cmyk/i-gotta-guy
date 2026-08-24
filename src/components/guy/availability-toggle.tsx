"use client";

import { useRouter } from "next/navigation";
import { Loader2, Pause, Play } from "lucide-react";
import { togglePauseAvailability } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { cn } from "@/lib/utils";

export function AvailabilityToggle({ isAvailable }: { isAvailable: boolean }) {
  const router = useRouter();
  const { run, pending } = useServerAction(togglePauseAvailability);

  async function handleClick() {
    const result = await run(!isAvailable);
    if (result) router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={isAvailable}
      className={cn(
        "tap-target inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors disabled:opacity-60",
        isAvailable
          ? "border-trust/30 bg-trust-light text-trust-dark hover:bg-trust-light/80"
          : "border-line bg-ink/5 text-ink-soft hover:bg-ink/10",
      )}
      title={isAvailable ? "You're accepting jobs — tap to pause" : "You're paused — tap to resume"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isAvailable ? (
        <Play className="h-4 w-4" />
      ) : (
        <Pause className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">{isAvailable ? "Available" : "Paused"}</span>
    </button>
  );
}
