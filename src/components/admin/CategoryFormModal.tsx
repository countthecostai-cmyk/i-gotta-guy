"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { upsertCategory } from "@/lib/actions/admin";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/primitives";
import { Modal } from "./Modal";

export interface CategoryFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  sortOrder: number;
  active: boolean;
}

const BLANK: CategoryFormValues = { name: "", slug: "", description: "", icon: "", sortOrder: 0, active: true };

export function CategoryFormModal({
  initial,
  triggerLabel,
  triggerVariant = "primary",
  triggerSize = "sm",
}: {
  initial?: CategoryFormValues;
  triggerLabel: string;
  triggerVariant?: ButtonProps["variant"];
  triggerSize?: ButtonProps["size"];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<CategoryFormValues>(initial ?? BLANK);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function openModal() {
    setForm(initial ?? BLANK);
    setError(null);
    setOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await upsertCategory(form);
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
      <Modal open={open} onClose={() => setOpen(false)} title={initial ? "Edit category" : "New category"}>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cat-slug">Slug</Label>
            <Input
              id="cat-slug"
              required
              pattern="[a-z0-9-]+"
              title="Lowercase letters, numbers, and hyphens only"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cat-icon">Icon (lucide name)</Label>
              <Input id="cat-icon" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="cat-sort">Sort order</Label>
              <Input
                id="cat-sort"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            Active (visible to customers)
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
