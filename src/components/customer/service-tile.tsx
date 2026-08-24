import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { formatCents } from "@/lib/domain/money";
import { CategoryIcon } from "./service-icon";
import type { PricingModel } from "@/types/database";

export interface ServiceLite {
  id: string;
  name: string;
  slug: string;
  short_description: string;
  pricing_model: PricingModel;
  min_price_cents: number;
  categoryName: string;
  categoryIcon: string;
}

export function priceLabel(service: Pick<ServiceLite, "pricing_model" | "min_price_cents">): string {
  if (service.pricing_model === "quote") return "Free quote";
  return `From ${formatCents(service.min_price_cents)}`;
}

export function ServiceTile({ service }: { service: ServiceLite }) {
  return (
    <Link href={`/app/request/${service.slug}`}>
      <Card className="tap-target group flex h-full flex-col gap-3 p-4 transition-colors hover:border-brand active:bg-brand-light/30">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-light text-brand-dark">
          <CategoryIcon icon={service.categoryIcon} className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-[15px] font-semibold leading-snug text-ink">{service.name}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{service.short_description}</p>
        </div>
        <p className="text-sm font-medium text-brand-dark">{priceLabel(service)}</p>
      </Card>
    </Link>
  );
}
