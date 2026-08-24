import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CategoryIcon } from "@/components/marketing/category-icon";
import { formatPriceSummary, type CatalogService } from "@/lib/marketing/catalog";

export function ServiceCard({ service }: { service: CatalogService }) {
  return (
    <Link
      href={`/services/${service.slug}`}
      className="group flex flex-col rounded-2xl border border-line bg-paper-raised p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
    >
      {service.service_categories && (
        <div className="flex items-center gap-1.5 text-xs font-medium text-ink-soft">
          <CategoryIcon icon={service.service_categories.icon} className="h-3.5 w-3.5" />
          <span>{service.service_categories.name}</span>
        </div>
      )}
      <h3 className="mt-2 font-display text-lg font-semibold text-ink group-hover:text-brand">
        {service.name}
      </h3>
      <p className="mt-1 flex-1 text-sm text-ink-soft">{service.short_description}</p>
      <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
        <span className="text-sm font-medium text-ink">{formatPriceSummary(service)}</span>
        <ArrowRight
          className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
