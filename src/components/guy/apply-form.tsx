"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyToBecomeGuy } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { ErrorBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Label, Textarea, Input } from "@/components/ui/primitives";

export function ApplyForm() {
  const router = useRouter();
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const { run, pending, error } = useServerAction(applyToBecomeGuy);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = await run({
      bio,
      yearsExperience: years.trim() === "" ? null : Number(years),
    });
    if (result) router.push("/guy");
  }

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
      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit application"}
      </Button>
    </form>
  );
}
