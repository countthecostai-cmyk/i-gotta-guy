"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, CircleCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, Textarea } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { submitReview } from "@/lib/actions/reviews";
import { ActionError } from "@/lib/actions/errors";

export function ReviewForm({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      setError("Please choose a star rating.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReview({ jobId, rating, comment: comment.trim() });
      setSubmitted(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't submit your review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="flex items-center gap-2 p-4 text-trust-dark">
        <CircleCheck className="h-5 w-5" />
        <p className="text-sm font-medium">Thanks for the review!</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <p className="font-display text-sm font-semibold text-ink">How did it go?</p>
      <div className="mt-2 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            className="tap-target p-1"
          >
            <Star
              className={cn(
                "h-7 w-7",
                n <= (hoverRating || rating) ? "fill-amber-400 text-amber-400" : "text-line",
              )}
            />
          </button>
        ))}
      </div>
      <Textarea
        rows={3}
        className="mt-3"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Tell other customers about your experience (optional)"
      />
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
      <Button className="mt-3" onClick={handleSubmit} disabled={submitting}>
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit review"}
      </Button>
    </Card>
  );
}
