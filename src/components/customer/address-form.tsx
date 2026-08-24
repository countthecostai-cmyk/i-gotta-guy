"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { addAddress } from "@/lib/actions/addresses";
import { ActionError } from "@/lib/actions/errors";
import type { Database } from "@/types/database";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

export function AddressForm({
  onSaved,
  onCancel,
  submitLabel = "Save address",
}: {
  onSaved: (address: Address) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [label, setLabel] = useState("Home");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!line1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setError("Please fill in the required address fields.");
      return;
    }
    setSaving(true);
    try {
      const address = await addAddress({
        label: label.trim() || "Home",
        line1: line1.trim(),
        line2: line2.trim() || null,
        city: city.trim(),
        state: state.trim(),
        postalCode: postalCode.trim(),
        isDefault,
      });
      onSaved(address);
    } catch (err) {
      setError(err instanceof ActionError ? err.message : "Couldn't save that address. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-xl border border-line bg-paper-raised p-4">
      <div>
        <Label htmlFor="addr-label">Label</Label>
        <Input id="addr-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work…" />
      </div>
      <div>
        <Label htmlFor="addr-line1">Street address *</Label>
        <Input id="addr-line1" value={line1} onChange={(e) => setLine1(e.target.value)} required />
      </div>
      <div>
        <Label htmlFor="addr-line2">Apt, suite, etc. (optional)</Label>
        <Input id="addr-line2" value={line2} onChange={(e) => setLine2(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="addr-city">City *</Label>
          <Input id="addr-city" value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>
        <div>
          <Label htmlFor="addr-state">State *</Label>
          <Input id="addr-state" value={state} onChange={(e) => setState(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label htmlFor="addr-postal">ZIP code *</Label>
        <Input id="addr-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} required />
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-4 w-4 accent-brand" />
        Set as default address
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Saving…" : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
