"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { upsertPromotion } from "@/lib/actions/admin";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { toCents } from "@/lib/domain/money";
import { Modal } from "./Modal";

export interface PromotionFormValues {
  id?: string;
  code: string;
  description: string;
  discountType: "percent" | "flat";
  discountValue: string; // percent number or dollars for flat
  maxUses: string; // "" = unlimited
  active: boolean;
  expiresAt: string; // yyyy-mm-dd or ""
}

function blank(): PromotionFormValues {
  return { code: "", description: "", discountType: "percent", discountValue: "10", maxUses: "", active: true, expiresAt: "" };
}

export function PromotionFormModal({
  initial,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "sm",
}: {
  initial?: PromotionFormValues;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<PromotionFormValues>(initial ?? blank());
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
        await upsertPromotion({
          id: form.id,
          code: form.code,
          description: form.description,
          discountType: form.discountType,
          // discount_value follows the same convention as promotions.discount_value:
          // a percent number (10 = 10%) or, for flat, a raw-cents amount.
          discountValue: form.discountType === "flat" ? toCents(Number(form.discountValue || 0)) : Number(form.discountValue || 0),
          maxUses: form.maxUses ? Number(form.maxUses) : null,
          active: form.active,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
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
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? "Edit promotion" : "New promotion"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="promo-code">Code</Label>
            <Input
              id="promo-code"
              required
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="WELCOME10"
            />
          </div>
          <div>
            <Label htmlFor="promo-desc">Description</Label>
            <Textarea
              id="promo-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="promo-type">Discount type</Label>
              <Select
                id="promo-type"
                value={form.discountType}
                onChange={(e) => setForm((f) => ({ ...f, discountType: e.target.value as "percent" | "flat" }))}
              >
                <option value="percent">Percent off</option>
                <option value="flat">Flat amount off</option>
              </Select>
            </div>
            <div>
              <Label htmlFor="promo-value">
                {form.discountType === "percent" ? "Percent (e.g. 10)" : "Amount off ($)"}
              </Label>
              <Input
                id="promo-value"
                type="number"
                step="0.01"
                min="0"
                value={form.discountValue}
                onChange={(e) => setForm((f) => ({ ...f, discountValue: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="promo-uses">Max uses</Label>
              <Input
                id="promo-uses"
                type="number"
                min="1"
                placeholder="Unlimited"
                value={form.maxUses}
                onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="promo-expires">Expires</Label>
              <Input
                id="promo-expires"
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
            </div>
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
