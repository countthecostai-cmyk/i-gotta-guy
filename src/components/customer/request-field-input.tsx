"use client";

import { Input, Textarea, Select, Label } from "@/components/ui/primitives";
import type { RequestField } from "@/types/database";

/** Red asterisk for always-required fields; a softer marker + caption for
 * requiredUnlessPhotos fields, so the customer knows skipping it is fine as
 * long as they attach photos — not that the field is simply optional. */
function FieldLabelText({ field }: { field: RequestField }) {
  if (field.required) {
    return (
      <>
        {field.label}
        <span className="text-danger"> *</span>
      </>
    );
  }
  if (field.requiredUnlessPhotos) {
    return (
      <>
        {field.label}
        <span className="text-ink-soft"> (or attach photos)</span>
      </>
    );
  }
  return <>{field.label}</>;
}

function FieldHint({ field }: { field: RequestField }) {
  if (!field.requiredUnlessPhotos) return null;
  return (
    <p className="mt-1 text-xs text-ink-soft">
      Skip this if you&rsquo;d rather attach photos below — your Guy will send a price after seeing them.
    </p>
  );
}

export function DynamicFieldInput({
  field,
  value,
  onChange,
}: {
  field: RequestField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = `field-${field.key}`;

  if (field.type === "boolean") {
    return (
      <label htmlFor={id} className="tap-target flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-line bg-paper-raised px-4 py-3">
        <span className="text-sm font-medium text-ink">
          <FieldLabelText field={field} />
        </span>
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
          className="h-5 w-5 accent-brand"
        />
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <Label htmlFor={id}>
          <FieldLabelText field={field} />
        </Label>
        <Select id={id} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="" disabled>
            Choose one…
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </Select>
        <FieldHint field={field} />
      </div>
    );
  }

  if (field.type === "multiselect") {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    function toggle(opt: string) {
      if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
      else onChange([...selected, opt]);
    }
    return (
      <div>
        <Label>
          <FieldLabelText field={field} />
        </Label>
        <div className="flex flex-wrap gap-2">
          {(field.options ?? []).map((opt) => {
            const active = selected.includes(opt);
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                className={
                  active
                    ? "tap-target rounded-full border border-brand bg-brand-light px-4 py-2 text-sm font-medium text-brand-dark"
                    : "tap-target rounded-full border border-line bg-paper-raised px-4 py-2 text-sm font-medium text-ink hover:bg-ink/5"
                }
              >
                {opt}
              </button>
            );
          })}
        </div>
        <FieldHint field={field} />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <Label htmlFor={id}>
          <FieldLabelText field={field} />
        </Label>
        <Textarea id={id} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        <FieldHint field={field} />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <Label htmlFor={id}>
          <FieldLabelText field={field} />
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
        <FieldHint field={field} />
      </div>
    );
  }

  // text (default)
  return (
    <div>
      <Label htmlFor={id}>
        <FieldLabelText field={field} />
      </Label>
      <Input id={id} type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      <FieldHint field={field} />
    </div>
  );
}
