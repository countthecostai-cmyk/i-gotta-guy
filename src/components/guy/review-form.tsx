"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { submitReview } from "@/lib/actions/reviews";
import { useServerAction } from "./hooks";
import { ErrorBanner, SuccessBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function ReviewForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { run, pending, error } = useServerAction(submitReview);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) return;
    const result = await run({ jobId, rating, comment });
    if (result) {
      setSubmitted(true);
      router.refresh();
    }
  }

  if (submitted) return <SuccessBanner message="Thanks — your review was submitted." />;

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <ErrorBanner message={error} />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="tap-target flex items-center justify-center p-0.5"
          >
            <Star className={cn("h-7 w-7", n <= rating ? "fill-brand text-brand" : "text-line")} />
          </button>
        ))}
      </div>
      <Textarea
        rows={3}
        placeholder="How was working with this customer? (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        maxLength={2000}
      />
      <Button type="submit" variant="primary" size="md" disabled={pending || rating === 0}>
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
