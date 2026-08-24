"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { upsertFeeRule } from "@/lib/actions/admin";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/primitives";
import { toCents } from "@/lib/domain/money";
import { Modal } from "./Modal";

export interface FeeRuleFormValues {
  id?: string;
  serviceId: string; // "" = global default
  feeType: "percent" | "flat";
  feeValue: string;
  minFeeDollars: string;
  active: boolean;
}

function blank(): FeeRuleFormValues {
  return { serviceId: "", feeType: "percent", feeValue: "15", minFeeDollars: "3.00", active: true };
}

export function FeeRuleFormModal({
  services,
  initial,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "sm",
}: {
  services: { id: string; name: string }[];
  initial?: FeeRuleFormValues;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<FeeRuleFormValues>(initial ?? blank());
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function openModal() {
    setForm(initial ?? blank());
    setError(null);
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await upsertFeeRule({
          id: form.id,
          serviceId: form.serviceId || null,
          feeType: form.feeType,
          // For "percent" rules this is a percentage (15 = 15%). For "flat"
          // rules the platform_fee_rules.fee_value column stores raw CENTS
          // directly (see supabase/migrations/0001_init.sql + lib/domain/pricing.ts),
          // not dollars — so no toCents() conversion here.
          feeValue: Number(form.feeValue || 0),
          minFeeCents: toCents(Number(form.minFeeDollars || 0)),
          active: form.active,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} onClick={openModal}>
        {triggerLabel}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? "Edit fee rule" : "New fee rule"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="fee-service">Applies to</Label>
            <Select
              id="fee-service"
              value={form.serviceId}
              onChange={(e) => setForm((f) => ({ ...f, serviceId: e.target.value }))}
            >
              <option value="">Global default (all services)</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fee-type">Fee type</Label>
              <Select
                id="fee-type"
                value={form.feeType}
                onChange={(e) => setForm((f) => ({ ...f, feeType: e.target.value as "percent" | "flat" }))}
              >
                <option value="percent">Percent</option>
                <option value="flat">Flat (cents)</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="fee-value">{form.feeType === "percent" ? "Percent (e.g. 15)" : "Flat amount (cents)"}</Label>
              <Input
                id="fee-value"
                type="number"
                step="0.01"
                min="0"
                value={form.feeValue}
                onChange={(e) => setForm((f) => ({ ...f, feeValue: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="fee-min">Minimum fee ($)</Label>
            <Input
              id="fee-min"
              type="number"
              step="0.01"
              min="0"
              value={form.minFeeDollars}
              onChange={(e) => setForm((f) => ({ ...f, minFeeDollars: e.target.value }))}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
