"use client";

import { useState } from "react";
import { Plus, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressForm } from "./address-form";
import type { Database } from "@/types/database";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

export function AddressPicker({
  addresses,
  selectedId,
  onSelect,
  onAdded,
}: {
  addresses: Address[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdded: (address: Address) => void;
}) {
  const [showForm, setShowForm] = useState(addresses.length === 0);

  return (
    <div className="space-y-2">
      {addresses.map((addr) => {
        const active = addr.id === selectedId;
        return (
          <button
            type="button"
            key={addr.id}
            onClick={() => onSelect(addr.id)}
            className={cn(
              "tap-target flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              active ? "border-brand bg-brand-light/40" : "border-line bg-paper-raised hover:bg-ink/5",
            )}
          >
            <MapPin className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-brand-dark" : "text-ink-soft")} />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink">{addr.label || "Address"}</span>
              <span className="block truncate text-sm text-ink-soft">
                {addr.line1}
                {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}
              </span>
            </span>
          </button>
        );
      })}

      {showForm ? (
        <AddressForm
          submitLabel="Use this address"
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
          onSaved={(address) => {
            onAdded(address);
            setShowForm(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="tap-target flex w-full items-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm font-medium text-brand hover:bg-brand-light/30"
        >
          <Plus className="h-4 w-4" />
          Add a new address
        </button>
      )}
    </div>
  );
}
