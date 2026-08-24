import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, DollarSign, MapPin, MessageCircle, ClipboardCheck, Wallet } from "lucide-react";
import { LinkButton } from "@/components/marketing/link-button";
import { FaqItem } from "@/components/marketing/faq-item";
import { Badge } from "@/components/ui/primitives";
import { FAQS } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "Become A Guy",
  description:
    "Turn your skills into income. Apply to become a Guy on I Gotta Guy, set your own services, service area, availability, and pricing.",
  alternates: { canonical: "/become-a-guy" },
};

const BENEFITS = [
  {
    icon: MapPin,
    title: "Work where you already are",
    description: "Set your service area and only get matched with jobs nearby.",
  },
  {
    icon: Calendar,
    title: "Your schedule, your call",
    description: "Set your availability and accept or decline jobs as they come in.",
  },
  {
    icon: DollarSign,
    title: "Know what you'll earn",
    description: "Every job shows your earnings clearly — service amount, platform fee, and tips are always separated out.",
  },
  {
    icon: MessageCircle,
    title: "Talk directly to customers",
    description: "Message customers about a job right in the app — no guessing what they need.",
  },
];

const STEPS = [
  {
    icon: ClipboardCheck,
    title: "Apply",
    description: "Create an account, tell us which services you offer, and submit your application.",
  },
  {
    icon: MapPin,
    title: "Set up your profile",
    description: "Add your service area, availability, and pricing where applicable.",
  },
  {
    icon: MessageCircle,
    title: "Accept jobs",
    description: "Get notified when a job matches your services and area. Accept the ones that fit your schedule.",
  },
  {
    icon: Wallet,
    title: "Get paid",
    description: "Complete the job, and your earnings — plus any tip — are paid out.",
  },
];

export default function BecomeAGuyPage() {
  return (
    <>
      <section className="border-b border-line bg-trust-light/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Badge variant="trust">For Guys</Badge>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Turn what you&rsquo;re good at into steady work.
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Mowing, hauling, cleaning, fixing — if you&rsquo;re good at it and local, there&rsquo;s demand for
            it. Set your services, your area, and your schedule, and start accepting jobs.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href="/signup/guy" variant="trust" size="lg">
              Apply to become a Guy
            </LinkButton>
            <LinkButton href="/how-it-works" variant="outline" size="lg">
              See how it works
            </LinkButton>
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">Why Guys work with us</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-2xl border border-line bg-paper-raised p-5">
                <b.icon className="h-6 w-6 text-trust" aria-hidden="true" />
                <h3 className="mt-4 font-display font-semibold text-ink">{b.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">Getting started</h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-paper p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-trust-light text-trust-dark">
                  <step.icon className="h-4.5 w-4.5" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  Step {i + 1}
                </p>
                <h3 className="mt-1 font-display font-semibold text-ink">{step.title}</h3>
                <p className="mt-1.5 text-sm text-ink-soft">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">What we look for</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              "Reliable — you show up when you say you will",
              "Skilled in at least one of our service categories",
              "Comfortable communicating with customers about job status",
              "Able to serve a real local area",
              "Willing to complete our application and profile setup",
            ].map((item) => (
              <li key={item} className="rounded-xl border border-line bg-paper-raised px-4 py-3 text-sm text-ink">
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-ink-soft">
            Every Guy completes an application and profile before receiving jobs. Learn more about
            how we approach verification on our{" "}
            <Link href="/trust-safety" className="font-medium text-brand hover:underline">
              Trust &amp; Safety page
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="bg-paper-raised">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-ink">Questions from Guys</h2>
          <div className="mt-8 space-y-3">
            {FAQS.filter((f) => f.question.toLowerCase().includes("guy") || f.question.toLowerCase().includes("pay")).map(
              (faq) => (
                <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
              ),
            )}
          </div>
          <div className="mt-8">
            <LinkButton href="/signup/guy" variant="trust" size="lg">
              Apply now
            </LinkButton>
          </div>
        </div>
      </section>
    </>
  );
}
