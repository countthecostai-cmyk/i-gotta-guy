import type { Metadata } from "next";
import { CategoryIcon } from "@/components/marketing/category-icon";
import { ServiceCard } from "@/components/marketing/service-card";
import { LinkButton } from "@/components/marketing/link-button";
import { EmptyState, ErrorState } from "@/components/ui/primitives";
import { getActiveServices, getActiveCategories, type CatalogService } from "@/lib/marketing/catalog";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Browse everyday local services on I Gotta Guy — lawn care, cleaning, hauling, handyman work, painting, and more.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const [{ services, configured, error: servicesError }, { categories, error: categoriesError }] =
    await Promise.all([getActiveServices(), getActiveCategories()]);

  const grouped = new Map<string, { name: string; icon: string; services: CatalogService[] }>();
  for (const category of categories) {
    grouped.set(category.slug, { name: category.name, icon: category.icon, services: [] });
  }
  for (const service of services) {
    const slug = service.service_categories?.slug;
    if (!slug) continue;
    if (!grouped.has(slug)) {
      grouped.set(slug, {
        name: service.service_categories?.name ?? "Other",
        icon: service.service_categories?.icon ?? "wrench",
        services: [],
      });
    }
    grouped.get(slug)!.services.push(service);
  }

  const hasContent = services.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
          All services
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Everyday jobs, handled by a local Guy. Pick a service to see pricing and what to
          expect.
        </p>
      </div>

      <div className="mt-10">
        {!configured ? (
          <EmptyState
            title="Our service catalog is coming online"
            description="We're finishing setup — check back shortly, or sign up now and we'll notify you as soon as services are ready to request in your area."
            action={<LinkButton href="/signup">Notify me</LinkButton>}
          />
        ) : servicesError || categoriesError ? (
          <ErrorState message={servicesError ?? categoriesError ?? "Something went wrong loading services."} />
        ) : !hasContent ? (
          <EmptyState
            title="No services available yet"
            description="We're adding services soon. Check back shortly."
          />
        ) : (
          <div className="space-y-14">
            {Array.from(grouped.values())
              .filter((group) => group.services.length > 0)
              .map((group) => (
                <div key={group.name}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-brand-dark">
                      <CategoryIcon icon={group.icon} />
                    </span>
                    <h2 className="font-display text-2xl font-bold text-ink">{group.name}</h2>
                  </div>
                  <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {group.services.map((service) => (
                      <ServiceCard key={service.id} service={service} />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
