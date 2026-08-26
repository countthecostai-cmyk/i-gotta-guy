"use client";

import { Input, Textarea, Select, Label } from "@/components/ui/primitives";
import type { RequestField } from "@/types/database";
import { RequestPhotoPicker, type PickedPhoto } from "./request-photo-picker";

/** Red asterisk for every required field — including requiredUnlessPhotos
 * fields, which ARE required overall (an answer is mandatory), just
 * satisfiable two ways. See RequiredNumberOrPhotoField below, which renders
 * the requiredUnlessPhotos case for number fields with the photo option
 * built in; this plain label is the fallback for any other field type. */
function FieldLabelText({ field }: { field: RequestField }) {
  if (field.required || field.requiredUnlessPhotos) {
    return (
      <>
        {field.label}
        <span className="text-danger"> *</span>
      </>
    );
  }
  return <>{field.label}</>;
}

function FieldHint({ field }: { field: RequestField }) {
  if (!field.requiredUnlessPhotos) return null;
  return (
    <p className="mt-1 text-xs text-ink-soft">
      Answer this, or attach a photo instead — your Guy will send a price after seeing it.
    </p>
  );
}

/**
 * A requiredUnlessPhotos number field (e.g. "Approximate lawn size"), with
 * the photo option built right in — not left for the customer to notice a
 * separate "Photos" section further down the form. The field is required
 * overall (red asterisk): the customer must either enter a number here or
 * attach a photo right below it. `photos` is the request's whole photo set
 * (shared with the rest of the form via the parent's state, since a photo
 * attached here is the same attachment used everywhere else on the
 * request) — this is simply where it's surfaced when a service has a field
 * like this.
 */
export function RequiredNumberOrPhotoField({
  field,
  value,
  onChange,
  photos,
  onPhotosChange,
}: {
  field: RequestField;
  value: unknown;
  onChange: (value: unknown) => void;
  photos: PickedPhoto[];
  onPhotosChange: (photos: PickedPhoto[]) => void;
}) {
  const id = `field-${field.key}`;
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
      <p className="mt-1 text-xs text-ink-soft">
        Enter a number, or skip it and attach a photo instead — your Guy will send a price after seeing it.
      </p>
      <div className="mt-3 rounded-xl border border-dashed border-line p-3">
        <RequestPhotoPicker photos={photos} onChange={onPhotosChange} />
      </div>
    </div>
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
