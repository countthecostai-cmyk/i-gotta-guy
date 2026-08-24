"use client";

import { useState, useTransition } from "react";
import { MapPin, Star, Trash2, Plus } from "lucide-react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { deleteAddress, setDefaultAddress } from "@/lib/actions/addresses";
import { ActionError } from "@/lib/actions/errors";
import { AddressForm } from "./address-form";
import type { Database } from "@/types/database";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

export function AddressList({ addresses: initial }: { addresses: Address[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [showForm, setShowForm] = useState(initial.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await deleteAddress(id);
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      } catch (err) {
        setError(err instanceof ActionError ? err.message : "Couldn't delete that address.");
      } finally {
        setPendingId(null);
      }
    });
  }

  function handleSetDefault(id: string) {
    setError(null);
    setPendingId(id);
    startTransition(async () => {
      try {
        await setDefaultAddress(id);
        setAddresses((prev) => prev.map((a) => ({ ...a, is_default: a.id === id })));
      } catch (err) {
        setError(err instanceof ActionError ? err.message : "Couldn't update your default address.");
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {addresses.length === 0 && !showForm && (
        <EmptyState
          title="No saved addresses"
          description="Add an address so you can request services faster next time."
        />
      )}

      <div className="space-y-3">
        {addresses.map((addr) => (
          <Card key={addr.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-soft" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-ink">{addr.label || "Address"}</p>
                  {addr.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-trust-light px-2 py-0.5 text-[11px] font-medium text-trust-dark">
                      <Star className="h-3 w-3 fill-trust-dark" /> Default
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {addr.line1}
                  {addr.line2 ? `, ${addr.line2}` : ""}, {addr.city}, {addr.state} {addr.postal_code}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-2">
              {!addr.is_default && (
                <button
                  type="button"
                  onClick={() => handleSetDefault(addr.id)}
                  disabled={pending && pendingId === addr.id}
                  className="text-xs font-medium text-brand hover:underline disabled:opacity-50"
                >
                  Set default
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(addr.id)}
                disabled={pending && pendingId === addr.id}
                aria-label="Delete address"
                className="tap-target text-ink-soft hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </Card>
        ))}
      </div>

      {showForm ? (
        <AddressForm
          onCancel={addresses.length > 0 ? () => setShowForm(false) : undefined}
          onSaved={(addr) => {
            setAddresses((prev) => [addr, ...prev]);
            setShowForm(false);
          }}
        />
      ) : (
        <Button variant="outline" onClick={() => setShowForm(true)} className="w-full">
          <Plus className="h-4 w-4" />
          Add a new address
        </Button>
      )}
    </div>
  );
}
