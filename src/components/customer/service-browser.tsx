"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, EmptyState } from "@/components/ui/primitives";
import { ServiceTile, type ServiceLite } from "./service-tile";

export interface CategoryGroup {
  id: string;
  name: string;
  icon: string;
  services: ServiceLite[];
}

export function ServiceBrowser({ categories, popular }: { categories: CategoryGroup[]; popular: ServiceLite[] }) {
  const [query, setQuery] = useState("");

  const allServices = useMemo(() => categories.flatMap((c) => c.services), [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return allServices.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.short_description.toLowerCase().includes(q) ||
        s.categoryName.toLowerCase().includes(q),
    );
  }, [allServices, query]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-soft" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a service…"
          className="pl-11"
          aria-label="Search services"
        />
      </div>

      {filtered ? (
        filtered.length > 0 ? (
          <div className="mt-5 grid grid-cols-2 gap-3">
            {filtered.map((s) => (
              <ServiceTile key={s.id} service={s} />
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No matching services"
              description={`We couldn't find anything for "${query}". Try a different search, or contact support if you need something else.`}
            />
          </div>
        )
      ) : (
        <div className="mt-6 space-y-8">
          {popular.length > 0 && (
            <section>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">Popular</h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {popular.map((s) => (
                  <ServiceTile key={s.id} service={s} />
                ))}
              </div>
            </section>
          )}
          {categories.map((category) => (
            <section key={category.id}>
              <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-ink-soft">
                {category.name}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-3">
                {category.services.map((s) => (
                  <ServiceTile key={s.id} service={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
