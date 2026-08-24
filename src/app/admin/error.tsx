"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/primitives";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="py-10">
      <ErrorState message="Something went wrong loading this page. Please try again." onRetry={reset} />
    </div>
  );
}
