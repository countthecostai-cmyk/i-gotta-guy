import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { CategoryIcon } from "@/components/marketing/category-icon";
import { LinkButton } from "@/components/marketing/link-button";
import { Badge, EmptyState } from "@/components/ui/primitives";
import { isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getServiceBySlug, formatPriceSummary, pricingModelExplanation } from "@/lib/marketing/catalog";

type Params = { slug: string };

async function getIsSignedIn() {
  if (!isSupabaseConfigured) return false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { service } = await getServiceBySlug(slug);
  if (!service) {
    return { title: "Service not found" };
  }
  return {
    title: service.name,
    description: service.description || service.short_description,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

export default async function ServiceDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;

  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <Link href="/services" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to services
        </Link>
        <div className="mt-8">
          <EmptyState
            title="This service page isn't available yet"
            description="Our catalog is still coming online. Browse all services or check back shortly."
            action={<LinkButton href="/services">Browse services</LinkButton>}
          />
        </div>
      </div>
    );
  }

  const [{ service }, isSignedIn] = await Promise.all([getServiceBySlug(slug), getIsSignedIn()]);

  if (!service) {
    notFound();
  }

  // /app (the dashboard) doesn't read a ?service= param — it always has;
  // the actual booking flow lives at /app/request/[slug]. Sending users to
  // /app silently dropped the service they'd just picked.
  const requestHref = isSignedIn
    ? `/app/request/${service.slug}`
    : `/signup?next=${encodeURIComponent(`/app/request/${service.slug}`)}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <Link
        href="/services"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to services
      </Link>

      <div className="mt-6">
        {service.service_categories && (
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            <CategoryIcon icon={service.service_categories.icon} className="h-3.5 w-3.5" />
            {service.service_categories.name}
          </Link>
        )}
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
          {service.name}
        </h1>
        <p className="mt-3 text-lg text-ink-soft">{service.description || service.short_description}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Pricing</p>
        <p className="mt-1 font-display text-2xl font-bold text-ink">
          {formatPriceSummary(service)}
        </p>
        <p className="mt-2 text-sm text-ink-soft">{pricingModelExplanation(service.pricing_model)}</p>
      </div>

      {Array.isArray(service.request_fields) && service.request_fields.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-ink">What we&rsquo;ll ask you for</h2>
          <ul className="mt-3 space-y-2">
            {service.request_fields.map((field) => (
              <li key={field.key} className="flex items-start gap-2 text-sm text-ink-soft">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-trust" aria-hidden="true" />
                <span>
                  {field.label}
                  {field.required && <Badge variant="muted" className="ml-2">Required</Badge>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 flex flex-col gap-3 border-t border-line pt-8 sm:flex-row">
        <LinkButton href={requestHref} size="lg">
          Request {service.name}
        </LinkButton>
        <LinkButton href="/how-it-works" variant="outline" size="lg">
          See how it works
        </LinkButton>
      </div>
    </div>
  );
}
