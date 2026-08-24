import type { Metadata } from "next";
import { ClipboardList, Search, Handshake, Wrench, CreditCard, Star } from "lucide-react";
import { LinkButton } from "@/components/marketing/link-button";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "See exactly how I Gotta Guy works, from requesting a service to your Guy showing up and getting paid.",
  alternates: { canonical: "/how-it-works" },
};

const CUSTOMER_STEPS = [
  {
    icon: ClipboardList,
    title: "Tell us what you need",
    description:
      "Choose a service, describe the job, add photos if it helps, and give us your address. The more detail you give, the more accurate your price.",
  },
  {
    icon: Search,
    title: "We match you with a Guy",
    description:
      "For flat-rate and hourly jobs, you'll see a price right away. Bigger or custom jobs (like junk removal or interior painting) get a real quote from a nearby Guy first.",
  },
  {
    icon: Handshake,
    title: "A Guy accepts the job",
    description:
      "Once a Guy accepts, you'll see who's coming, message them directly, and track their status — scheduled, en route, arrived, in progress.",
  },
  {
    icon: Wrench,
    title: "The job gets done",
    description:
      "Your Guy completes the work. For some services you'll get before/after photos so you know exactly what was done.",
  },
  {
    icon: CreditCard,
    title: "You pay securely",
    description:
      "Payment is handled through the platform — never cash in hand unless a service is explicitly set up that way. Add a tip if you'd like.",
  },
  {
    icon: Star,
    title: "Rate the job",
    description:
      "Leave a rating and review. It helps other customers, and it helps good Guys get more work.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Badge variant="brand">How it works</Badge>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink">
            From &ldquo;I need something done&rdquo; to done.
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Here&rsquo;s exactly what happens when you request a service — and what happens on the
            other side when you become a Guy.
          </p>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-ink">For customers</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CUSTOMER_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-paper-raised p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-light text-brand-dark">
                    <step.icon className="h-4.5 w-4.5" aria-hidden="true" />
                  </span>
                  <span className="font-display text-xs font-semibold uppercase tracking-wide text-ink-soft">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 font-display font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{step.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8">
            <LinkButton href="/signup">Get something done</LinkButton>
          </div>
        </div>
      </section>

      <section className="bg-trust-light/40">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-ink">For Guys</h2>
          <p className="mt-3 max-w-2xl text-ink-soft">
            Apply, build your profile, and choose which services you offer and where. Jobs come
            to you based on your service area and availability — accept what fits your schedule,
            message customers, update job status as you work, and get paid.
          </p>
          <div className="mt-6">
            <LinkButton href="/become-a-guy" variant="trust">
              See how being a Guy works
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
