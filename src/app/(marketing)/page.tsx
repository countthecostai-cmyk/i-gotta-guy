import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  DollarSign,
  ShieldCheck,
  Star,
  CheckCircle2,
  Users,
  Wrench,
  ArrowRight,
} from "lucide-react";
import { LinkButton } from "@/components/marketing/link-button";
import { ServiceCard } from "@/components/marketing/service-card";
import { FaqItem } from "@/components/marketing/faq-item";
import { Badge } from "@/components/ui/primitives";
import { isSupabaseConfigured, SITE_NAME } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { getActiveServices, getActiveCategories } from "@/lib/marketing/catalog";
import { FAQS, TESTIMONIALS, HOW_IT_WORKS_STEPS } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Need Something Done? We Got A Guy.",
  description:
    "I Gotta Guy connects you with trusted local providers for lawn care, cleaning, hauling, handyman work, painting, and more. Clear pricing, real people, fast.",
  alternates: { canonical: "/" },
};

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

const FALLBACK_CATEGORY_NAMES = [
  "Lawn & Yard",
  "Cleaning",
  "Hauling & Moving",
  "Handyman",
  "Painting",
];

export default async function HomePage() {
  const [isSignedIn, { services }, { categories }] = await Promise.all([
    getIsSignedIn(),
    getActiveServices(),
    getActiveCategories(),
  ]);

  const popularServices = services.slice(0, 6);
  const categoryNames = categories.length
    ? categories.map((c) => c.name)
    : FALLBACK_CATEGORY_NAMES;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:items-center md:py-20 lg:px-8">
          <div>
            <Badge variant="brand">Local services, done right</Badge>
            <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Need Something Done? We Got A Guy.
            </h1>
            <p className="mt-4 max-w-md text-lg text-ink-soft">
              Request lawn care, cleaning, hauling, handyman work, painting, and more from a
              trusted local Guy. See your price up front, track the job, pay when it&rsquo;s done.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <LinkButton href={isSignedIn ? "/app" : "/signup"} size="lg">
                Get Something Done
              </LinkButton>
              <LinkButton href="/signup/guy" variant="outline" size="lg">
                Become A Guy
              </LinkButton>
            </div>
            <dl className="mt-8 grid grid-cols-3 gap-4 border-t border-line pt-6 text-sm">
              <div>
                <dt className="sr-only">Pricing</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <DollarSign className="h-4 w-4 text-trust" aria-hidden="true" />
                  Clear pricing
                </dd>
              </div>
              <div>
                <dt className="sr-only">Speed</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <Clock className="h-4 w-4 text-trust" aria-hidden="true" />
                  Fast matching
                </dd>
              </div>
              <div>
                <dt className="sr-only">Trust</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <ShieldCheck className="h-4 w-4 text-trust" aria-hidden="true" />
                  Local & vetted
                </dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="rounded-3xl border border-line bg-paper-raised p-6 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">
                Your request
              </p>
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-paper px-4 py-3">
                <span className="font-display font-semibold text-ink">Lawn Mowing</span>
                <Badge variant="trust">Matching...</Badge>
              </div>
              <ul className="mt-4 space-y-3">
                {[
                  { label: "Job requested", done: true },
                  { label: "Guy accepted — Mike R.", done: true },
                  { label: "En route", done: false },
                ].map((item) => (
                  <li key={item.label} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle2
                      className={item.done ? "h-4 w-4 text-trust" : "h-4 w-4 text-ink-soft/40"}
                      aria-hidden="true"
                    />
                    <span className={item.done ? "text-ink" : "text-ink-soft"}>{item.label}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-sm text-ink-soft">Total (before tip)</span>
                <span className="font-display text-lg font-bold text-ink">$45.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-3xl font-bold text-ink">How it works</h2>
            <p className="mt-2 text-ink-soft">
              From &ldquo;I need something done&rdquo; to &ldquo;someone&rsquo;s taking care of it&rdquo; — in four steps.
            </p>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-paper p-5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-light font-display text-sm font-bold text-brand-dark">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Popular Services */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold text-ink">Popular services</h2>
              <p className="mt-2 max-w-xl text-ink-soft">
                A growing list of everyday jobs — new services are added regularly.
              </p>
            </div>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Browse all services
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {popularServices.length > 0 ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {popularServices.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="text-ink-soft">
                Our full catalog is on its way. Here&rsquo;s what you&rsquo;ll be able to request:
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                {categoryNames.map((name) => (
                  <Badge key={name} variant="muted">
                    {name}
                  </Badge>
                ))}
              </div>
              <div className="mt-6">
                <LinkButton href="/services" variant="outline" size="sm">
                  See the services page
                </LinkButton>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Why I Gotta Guy */}
      <section className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">Why I Gotta Guy</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                icon: Clock,
                title: "Fast",
                description: "Request a service and get matched with a local Guy quickly — no phone tag, no waiting on callbacks.",
              },
              {
                icon: DollarSign,
                title: "Transparent pricing",
                description: "Flat and hourly rates are shown up front. Custom jobs get a real quote before any work starts.",
              },
              {
                icon: ShieldCheck,
                title: "Trust, built in",
                description: "Every job has a real profile, a status history, and a rating attached to it — nothing happens off the record.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-line bg-paper p-6">
                <item.icon className="h-6 w-6 text-brand" aria-hidden="true" />
                <h3 className="mt-4 font-display font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Customers / For Guys */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:px-8">
          <div className="rounded-3xl border border-line bg-paper-raised p-8">
            <Users className="h-7 w-7 text-brand" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl font-bold text-ink">For customers</h3>
            <p className="mt-2 text-ink-soft">
              Request a service, see the price, track the job, and pay when it&rsquo;s done — all from
              your phone.
            </p>
            <LinkButton href={isSignedIn ? "/app" : "/signup"} className="mt-6" size="sm">
              Get started
            </LinkButton>
          </div>
          <div className="rounded-3xl border border-line bg-paper-raised p-8">
            <Wrench className="h-7 w-7 text-trust" aria-hidden="true" />
            <h3 className="mt-4 font-display text-2xl font-bold text-ink">For Guys</h3>
            <p className="mt-2 text-ink-soft">
              Set your services, your service area, and your availability. Accept jobs that fit
              your schedule and get paid.
            </p>
            <LinkButton href="/signup/guy" variant="trust" className="mt-6" size="sm">
              Become a Guy
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="border-b border-line bg-trust-light/40">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <Badge variant="trust">Trust & Safety</Badge>
              <h2 className="mt-4 font-display text-3xl font-bold text-ink">
                Built around trust, not just convenience
              </h2>
              <p className="mt-3 text-ink-soft">
                Guys apply and build a real profile before taking jobs. Every job has a status
                history, every payment is traceable, and every completed job can be rated. See
                exactly what&rsquo;s verified today on our Trust &amp; Safety page.
              </p>
            </div>
            <LinkButton href="/trust-safety" variant="trust">
              Learn more
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">What people are saying</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Illustrative examples of the experience we&rsquo;re building toward — not verified customer
            quotes.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.quote} className="rounded-2xl border border-line bg-paper-raised p-6">
                <div className="flex gap-0.5 text-brand" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-3 text-sm text-ink">&ldquo;{t.quote}&rdquo;</blockquote>
                <figcaption className="mt-4 text-xs font-medium text-ink-soft">
                  {t.name} · {t.detail}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">Frequently asked questions</h2>
          <div className="mt-8 space-y-3">
            {FAQS.slice(0, 5).map((faq) => (
              <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
            ))}
          </div>
          <Link
            href="/faq"
            className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
          >
            See all FAQs
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-ink">
        <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-paper">
            Ready to get something done?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-paper/70">
            Join {SITE_NAME} and request your first service in minutes.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href={isSignedIn ? "/app" : "/signup"} size="lg">
              Get Something Done
            </LinkButton>
            <LinkButton href="/signup/guy" variant="outline" size="lg" className="border-paper/30 text-paper hover:bg-paper/10">
              Become A Guy
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
