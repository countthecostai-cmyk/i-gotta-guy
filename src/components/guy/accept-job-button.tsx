"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { acceptOpenJob } from "@/lib/actions/jobs";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";

export function AcceptJobButton({ jobId, className }: { jobId: string; className?: string }) {
  const router = useRouter();
  const { run, pending, error } = useServerAction(acceptOpenJob);

  async function handleClick() {
    const result = await run(jobId);
    if (result) router.refresh();
  }

  return (
    <div className={className}>
      <ErrorBanner message={error} className="mb-2" />
      <Button type="button" variant="trust" size="md" onClick={handleClick} disabled={pending} className="w-full">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {pending ? "Accepting…" : "Accept job"}
      </Button>
    </div>
  );
}
