"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Calendar, Zap, Loader2 } from "lucide-react";
import { Card, Label, Textarea, Input, ErrorState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { calculatePricing, type PlatformFeeRule } from "@/lib/domain/pricing";
import { formatCents } from "@/lib/domain/money";
import { createJobRequest } from "@/lib/actions/jobs";
import { ActionError } from "@/lib/actions/errors";
import type { Database, RequestField } from "@/types/database";
import { CategoryIcon } from "./service-icon";
import { AddressPicker } from "./address-picker";
import { DynamicFieldInput } from "./request-field-input";
import { PriceBreakdown } from "./price-breakdown";
import { inferQuantity, defaultDetailsValue, validateRequiredFields } from "./request-fields";

type Address = Database["public"]["Tables"]["addresses"]["Row"];

export interface RequestableService {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  pricing_model: "flat" | "hourly" | "quantity" | "sqft" | "quote";
  base_price_cents: number;
  min_price_cents: number;
  unit_label: string | null;
  request_fields: RequestField[];
  category_icon: string;
}

export interface RequestableAddon {
  id: string;
  name: string;
  price_cents: number;
}

export interface RebookPrefill {
  addressId: string | null;
  details: Record<string, unknown>;
  addonIds: string[];
  description: string;
}

function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function RequestForm({
  service,
  addons,
  addresses: initialAddresses,
  feeRule,
  prefill,
}: {
  service: RequestableService;
  addons: RequestableAddon[];
  addresses: Address[];
  feeRule: PlatformFeeRule;
  prefill: RebookPrefill | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "review">("form");
  const [addresses, setAddresses] = useState(initialAddresses);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    prefill?.addressId ?? initialAddresses.find((a) => a.is_default)?.id ?? initialAddresses[0]?.id ?? null,
  );
  const [details, setDetails] = useState<Record<string, unknown>>(() => {
    const base: Record<string, unknown> = {};
    for (const f of service.request_fields) base[f.key] = defaultDetailsValue(f);
    return { ...base, ...(prefill?.details ?? {}) };
  });
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(prefill?.addonIds ?? []);
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [isAsap, setIsAsap] = useState(true);
  const defaultScheduled = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return toLocalDateTimeInputValue(d);
  }, []);
  const [scheduledLocal, setScheduledLocal] = useState(defaultScheduled);
  const [promoCode, setPromoCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const quantity = useMemo(
    () => inferQuantity(service.pricing_model, service.request_fields, details),
    [service.pricing_model, service.request_fields, details],
  );

  const selectedAddonObjects = useMemo(
    () => addons.filter((a) => selectedAddonIds.includes(a.id)),
    [addons, selectedAddonIds],
  );

  const pricing = useMemo(
    () =>
      calculatePricing({
        service: {
          pricing_model: service.pricing_model,
          base_price_cents: service.base_price_cents,
          min_price_cents: service.min_price_cents,
        },
        quantity,
        selectedAddons: selectedAddonObjects,
        feeRule,
      }),
    [service, quantity, selectedAddonObjects, feeRule],
  );

  const selectedAddress = addresses.find((a) => a.id === selectedAddressId) ?? null;

  function updateDetail(key: string, value: unknown) {
    setDetails((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAddon(id: string) {
    setSelectedAddonIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function goToReview() {
    setFormError(null);
    if (!selectedAddressId) {
      setFormError("Please choose or add a service address.");
      return;
    }
    const fieldError = validateRequiredFields(service.request_fields, details);
    if (fieldError) {
      setFormError(fieldError);
      return;
    }
    if (!isAsap && !scheduledLocal) {
      setFormError("Please choose a date and time, or select ASAP.");
      return;
    }
    if (!isAsap) {
      const chosen = new Date(scheduledLocal);
      if (Number.isNaN(chosen.getTime()) || chosen.getTime() < Date.now()) {
        setFormError("Please choose a time in the future.");
        return;
      }
    }
    setStep("review");
  }

  async function handleSubmit() {
    if (!selectedAddressId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createJobRequest({
        serviceId: service.id,
        addressId: selectedAddressId,
        details,
        addonIds: selectedAddonIds,
        quantity: quantity ?? null,
        description,
        isAsap,
        scheduledStart: isAsap ? null : new Date(scheduledLocal).toISOString(),
        promotionCode: promoCode.trim() || null,
      });

      if (result.redirectUrl) {
        window.location.href = result.redirectUrl;
        return;
      }
      router.push(`/app/jobs/${result.jobId}`);
    } catch (err) {
      setSubmitError(err instanceof ActionError ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (step === "review") {
    return (
      <div className="space-y-5 pb-28">
        <button
          type="button"
          onClick={() => setStep("form")}
          className="flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to edit
        </button>

        <div>
          <h1 className="font-display text-xl font-bold text-ink">Your Request</h1>
          <p className="mt-1 text-sm text-ink-soft">Review the details before you {pricing.isEstimate ? "send it" : "pay"}.</p>
        </div>

        <Card className="divide-y divide-line p-0">
          <div className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
              <CategoryIcon icon={service.category_icon} className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-[15px] font-semibold text-ink">{service.name}</p>
              <p className="text-sm text-ink-soft">{isAsap ? "ASAP" : new Date(scheduledLocal).toLocaleString()}</p>
            </div>
          </div>
          {selectedAddress && (
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Location</p>
              <p className="mt-1 text-sm text-ink">
                {selectedAddress.line1}
                {selectedAddress.line2 ? `, ${selectedAddress.line2}` : ""}, {selectedAddress.city}, {selectedAddress.state}{" "}
                {selectedAddress.postal_code}
              </p>
            </div>
          )}
          {description.trim() && (
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Notes</p>
              <p className="mt-1 text-sm text-ink">{description}</p>
            </div>
          )}
          {selectedAddonObjects.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Add-ons</p>
              <ul className="mt-1 space-y-1">
                {selectedAddonObjects.map((a) => (
                  <li key={a.id} className="flex justify-between text-sm text-ink">
                    <span>{a.name}</span>
                    <span>{formatCents(a.price_cents)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <PriceBreakdown
            lines={[
              { label: "Service amount", cents: pricing.serviceAmountCents },
              { label: "Add-ons", cents: pricing.addonAmountCents, muted: true },
              { label: "Discount", cents: pricing.discountCents, isSubtraction: true, muted: true },
              { label: "Tax", cents: pricing.taxCents, muted: true },
              { label: "Platform fee", cents: pricing.platformFeeCents },
            ]}
            totalCents={pricing.totalCents}
            totalLabel="Total due"
            isEstimate={pricing.isEstimate}
          />
        </Card>

        {submitError && <ErrorState message={submitError} />}

        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
          <div className="mx-auto max-w-3xl">
            <Button size="lg" className="w-full" onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Submitting…
                </>
              ) : pricing.isEstimate ? (
                "Request Service"
              ) : (
                `Request & Pay ${formatCents(pricing.totalCents)}`
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-28">
      <div>
        <h1 className="font-display text-xl font-bold text-ink">{service.name}</h1>
        <p className="mt-1 text-sm text-ink-soft">{service.short_description}</p>
      </div>

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-ink">Where do you need this done?</h2>
        <AddressPicker
          addresses={addresses}
          selectedId={selectedAddressId}
          onSelect={setSelectedAddressId}
          onAdded={(addr) => {
            setAddresses((prev) => [addr, ...prev]);
            setSelectedAddressId(addr.id);
          }}
        />
      </section>

      {service.request_fields.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-sm font-semibold text-ink">Job details</h2>
          {service.request_fields.map((field) => (
            <DynamicFieldInput
              key={field.key}
              field={field}
              value={details[field.key]}
              onChange={(v) => updateDetail(field.key, v)}
            />
          ))}
        </section>
      )}

      {addons.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-sm font-semibold text-ink">Add-ons</h2>
          <div className="space-y-2">
            {addons.map((addon) => {
              const checked = selectedAddonIds.includes(addon.id);
              return (
                <label
                  key={addon.id}
                  className={cn(
                    "tap-target flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3",
                    checked ? "border-brand bg-brand-light/40" : "border-line bg-paper-raised hover:bg-ink/5",
                  )}
                >
                  <span className="flex items-center gap-3">
                    <input type="checkbox" checked={checked} onChange={() => toggleAddon(addon.id)} className="h-4 w-4 accent-brand" />
                    <span className="text-sm font-medium text-ink">{addon.name}</span>
                  </span>
                  <span className="text-sm text-ink-soft">+{formatCents(addon.price_cents)}</span>
                </label>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-display text-sm font-semibold text-ink">When?</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setIsAsap(true)}
            className={cn(
              "tap-target flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
              isAsap ? "border-brand bg-brand-light/40 text-brand-dark" : "border-line text-ink hover:bg-ink/5",
            )}
          >
            <Zap className="h-4 w-4" /> ASAP
          </button>
          <button
            type="button"
            onClick={() => setIsAsap(false)}
            className={cn(
              "tap-target flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium",
              !isAsap ? "border-brand bg-brand-light/40 text-brand-dark" : "border-line text-ink hover:bg-ink/5",
            )}
          >
            <Calendar className="h-4 w-4" /> Schedule
          </button>
        </div>
        {!isAsap && (
          <Input
            type="datetime-local"
            className="mt-3"
            value={scheduledLocal}
            min={toLocalDateTimeInputValue(new Date())}
            onChange={(e) => setScheduledLocal(e.target.value)}
          />
        )}
      </section>

      <section>
        <Label htmlFor="description">Anything else your Guy should know? (optional)</Label>
        <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
      </section>

      <section>
        <Label htmlFor="promo">Promo code (optional)</Label>
        <Input id="promo" value={promoCode} onChange={(e) => setPromoCode(e.target.value.toUpperCase())} placeholder="SAVE10" />
      </section>

      {formError && <p className="text-sm font-medium text-danger">{formError}</p>}

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-line bg-paper/95 p-4 backdrop-blur md:static md:border-0 md:bg-transparent md:p-0">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-ink-soft">{pricing.isEstimate ? "Estimated total" : "Estimated total"}</p>
            <p className="font-display text-lg font-bold text-ink">{formatCents(pricing.totalCents)}</p>
          </div>
          <Button size="lg" onClick={goToReview} className="flex-1 max-w-xs">
            Review request
          </Button>
        </div>
      </div>
    </div>
  );
}
