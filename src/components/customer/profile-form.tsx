"use client";

import { useState } from "react";
import { Loader2, CircleCheck } from "lucide-react";
import { Card, Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { updateMyProfile } from "@/app/app/profile/actions";
import { ActionError } from "@/lib/actions/errors";

export function ProfileForm({ fullName: initialName, phone: initialPhone }: { fullName: string; phone: string | null }) {
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      await updateMyProfile({ fullName, phone: phone.trim() || null });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-sm text-trust-dark">
              <CircleCheck className="h-4 w-4" /> Saved
            </span>
          )}
        </div>
      </form>
    </Card>
  );
}
