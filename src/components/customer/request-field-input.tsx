"use client";

import { Input, Textarea, Select, Label } from "@/components/ui/primitives";
import type { RequestField } from "@/types/database";

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
          {field.label}
          {field.required && <span className="text-danger"> *</span>}
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
          {field.label}
          {field.required && <span className="text-danger"> *</span>}
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
          {field.label}
          {field.required && <span className="text-danger"> *</span>}
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
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="text-danger"> *</span>}
        </Label>
        <Textarea id={id} rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <div>
        <Label htmlFor={id}>
          {field.label}
          {field.required && <span className="text-danger"> *</span>}
        </Label>
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
        />
      </div>
    );
  }

  // text (default)
  return (
    <div>
      <Label htmlFor={id}>
        {field.label}
        {field.required && <span className="text-danger"> *</span>}
      </Label>
      <Input id={id} type="text" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
