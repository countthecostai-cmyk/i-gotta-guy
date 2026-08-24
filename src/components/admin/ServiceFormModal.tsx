"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { upsertService } from "@/lib/actions/admin";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/primitives";
import { toCents } from "@/lib/domain/money";
import { Modal } from "./Modal";
import type { RequestField } from "@/types/database";

export interface ServiceFormValues {
  id?: string;
  categoryId: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  pricingModel: "flat" | "hourly" | "quantity" | "sqft" | "quote";
  basePriceDollars: string;
  minPriceDollars: string;
  unitLabel: string;
  active: boolean;
  requestFields: RequestField[];
}

const PRICING_MODELS: { value: ServiceFormValues["pricingModel"]; label: string }[] = [
  { value: "flat", label: "Flat fee" },
  { value: "hourly", label: "Hourly" },
  { value: "quantity", label: "Quantity-based" },
  { value: "sqft", label: "Square-foot based" },
  { value: "quote", label: "Custom quote (Guy sets price)" },
];

const FIELD_TYPES: RequestField["type"][] = ["text", "textarea", "number", "boolean", "select", "multiselect"];

function blankField(): RequestField {
  return { key: "", label: "", type: "text", required: false };
}

function blank(categoryId: string): ServiceFormValues {
  return {
    categoryId,
    name: "",
    slug: "",
    shortDescription: "",
    description: "",
    pricingModel: "flat",
    basePriceDollars: "0",
    minPriceDollars: "0",
    unitLabel: "",
    active: true,
    requestFields: [],
  };
}

export function ServiceFormModal({
  categories,
  initial,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "sm",
}: {
  categories: { id: string; name: string }[];
  initial?: ServiceFormValues;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<ServiceFormValues>(initial ?? blank(categories[0]?.id ?? ""));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function openModal() {
    setForm(initial ?? blank(categories[0]?.id ?? ""));
    setError(null);
    setOpen(true);
  }

  function updateField(index: number, patch: Partial<RequestField>) {
    setForm((f) => ({
      ...f,
      requestFields: f.requestFields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
    }));
  }

  function removeField(index: number) {
    setForm((f) => ({ ...f, requestFields: f.requestFields.filter((_, i) => i !== index) }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.categoryId) {
      setError("Choose a category.");
      return;
    }
    startTransition(async () => {
      try {
        await upsertService({
          id: form.id,
          categoryId: form.categoryId,
          name: form.name,
          slug: form.slug,
          shortDescription: form.shortDescription,
          description: form.description,
          pricingModel: form.pricingModel,
          basePriceCents: toCents(Number(form.basePriceDollars || 0)),
          minPriceCents: toCents(Number(form.minPriceDollars || 0)),
          unitLabel: form.unitLabel || null,
          active: form.active,
          requestFields: form.requestFields.filter((rf) => rf.key.trim() && rf.label.trim()),
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
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? "Edit service" : "New service"} maxWidth="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="svc-name">Name</Label>
              <Input id="svc-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="svc-slug">Slug</Label>
              <Input
                id="svc-slug"
                required
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="svc-category">Category</Label>
            <Select
              id="svc-category"
              required
              value={form.categoryId}
              onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="svc-short">Short description</Label>
            <Input
              id="svc-short"
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
              placeholder="Shown on category/browse pages"
            />
          </div>

          <div>
            <Label htmlFor="svc-desc">Full description</Label>
            <Textarea
              id="svc-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="svc-model">Pricing model</Label>
              <Select
                id="svc-model"
                value={form.pricingModel}
                onChange={(e) => setForm((f) => ({ ...f, pricingModel: e.target.value as ServiceFormValues["pricingModel"] }))}
              >
                {PRICING_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="svc-base">Base price ($)</Label>
              <Input
                id="svc-base"
                type="number"
                step="0.01"
                min="0"
                value={form.basePriceDollars}
                onChange={(e) => setForm((f) => ({ ...f, basePriceDollars: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="svc-min">Minimum price ($)</Label>
              <Input
                id="svc-min"
                type="number"
                step="0.01"
                min="0"
                value={form.minPriceDollars}
                onChange={(e) => setForm((f) => ({ ...f, minPriceDollars: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="svc-unit">Unit label</Label>
              <Input
                id="svc-unit"
                placeholder="per hour"
                value={form.unitLabel}
                onChange={(e) => setForm((f) => ({ ...f, unitLabel: e.target.value }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active (bookable by customers)
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label className="mb-0">Request form fields</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setForm((f) => ({ ...f, requestFields: [...f.requestFields, blankField()] }))}
              >
                <Plus size={14} /> Add field
              </Button>
            </div>
            {form.requestFields.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line px-3 py-4 text-center text-xs text-ink-soft">
                No custom questions — customers will only see description/photos/address.
              </p>
            ) : (
              <div className="space-y-2">
                {form.requestFields.map((field, i) => (
                  <div key={i} className="rounded-xl border border-line p-3">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                      <Input
                        placeholder="key"
                        value={field.key}
                        onChange={(e) => updateField(i, { key: e.target.value })}
                        className="sm:col-span-1"
                      />
                      <Input
                        placeholder="Label shown to customer"
                        value={field.label}
                        onChange={(e) => updateField(i, { label: e.target.value })}
                        className="sm:col-span-2"
                      />
                      <Select
                        value={field.type}
                        onChange={(e) => updateField(i, { type: e.target.value as RequestField["type"] })}
                        className="sm:col-span-1"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </Select>
                      <div className="flex items-center justify-between gap-2 sm:col-span-1">
                        <label className="flex items-center gap-1.5 text-xs text-ink-soft">
                          <input
                            type="checkbox"
                            checked={!!field.required}
                            onChange={(e) => updateField(i, { required: e.target.checked })}
                          />
                          Required
                        </label>
                        <button
                          type="button"
                          onClick={() => removeField(i)}
                          aria-label="Remove field"
                          className="tap-target rounded-lg p-1.5 text-danger hover:bg-danger-light"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    {(field.type === "select" || field.type === "multiselect") && (
                      <Input
                        className="mt-2"
                        placeholder="Options, comma-separated"
                        value={(field.options ?? []).join(", ")}
                        onChange={(e) =>
                          updateField(i, {
                            options: e.target.value
                              .split(",")
                              .map((o) => o.trim())
                              .filter(Boolean),
                          })
                        }
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

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
