"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateGuyProfile } from "@/lib/actions/guys";
import { useServerAction } from "./hooks";
import { ErrorBanner, SuccessBanner } from "./error-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";

export interface ProfileBasicInitial {
  fullName: string;
  phone: string;
  bio: string;
  yearsExperience: number | null;
}

export function ProfileBasicForm({ initial }: { initial: ProfileBasicInitial }) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.fullName);
  const [phone, setPhone] = useState(initial.phone);
  const [bio, setBio] = useState(initial.bio);
  const [years, setYears] = useState(initial.yearsExperience != null ? String(initial.yearsExperience) : "");
  const [saved, setSaved] = useState(false);
  const { run, pending, error } = useServerAction(updateGuyProfile);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    const result = await run({
      fullName,
      phone,
      bio,
      yearsExperience: years.trim() === "" ? null : Number(years),
    });
    if (result) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <ErrorBanner message={error} />
      {saved && <SuccessBanner message="Profile saved." />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-1234" />
        </div>
      </div>
      <div>
        <Label htmlFor="years">Years of experience</Label>
        <Input
          id="years"
          type="number"
          min={0}
          max={80}
          value={years}
          onChange={(e) => setYears(e.target.value)}
          className="max-w-[160px]"
        />
      </div>
      <div>
        <Label htmlFor="bio">Bio</Label>
        <Textarea id="bio" rows={4} maxLength={2000} value={bio} onChange={(e) => setBio(e.target.value)} />
        <p className="mt-1 text-xs text-ink-soft">Shown on your public profile once approved.</p>
      </div>
      <Button type="submit" variant="primary" size="md" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}
