import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, UserCheck, Star, MessageSquareWarning, Lock, FileCheck } from "lucide-react";
import { LinkButton } from "@/components/marketing/link-button";
import { Badge } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Trust & Safety",
  description:
    "How I Gotta Guy approaches provider verification, ratings, payments, and support to keep customers and Guys safe.",
  alternates: { canonical: "/trust-safety" },
};

const PILLARS = [
  {
    icon: UserCheck,
    title: "Real profiles, every time",
    description:
      "Every Guy applies with a real identity and builds a profile before they can accept jobs — there's no anonymous access to the platform.",
  },
  {
    icon: FileCheck,
    title: "Verification status, shown honestly",
    description:
      "Our platform is built to track and display identity verification and background-check status on every Guy's profile. We only ever show a status that reflects what has actually been completed — never a claim we can't back up.",
  },
  {
    icon: Star,
    title: "Ratings tied to real jobs",
    description:
      "Reviews can only be left by a customer or Guy who was actually part of that job — you can't manufacture a rating.",
  },
  {
    icon: Lock,
    title: "Secure payments",
    description:
      "Payments are processed through the platform, never handled off-record. Every transaction — the service amount, platform fee, tip, and provider earnings — is tracked separately and traceable back to the job.",
  },
  {
    icon: MessageSquareWarning,
    title: "Reporting & disputes",
    description:
      "If something goes wrong, you can report it. Support can review job history, messages, and photos tied to the job to help resolve disputes.",
  },
  {
    icon: ShieldCheck,
    title: "Data stays yours",
    description:
      "Your account, addresses, and messages are only visible to you and the people you're actively working with on a job.",
  },
];

export default function TrustSafetyPage() {
  return (
    <>
      <section className="border-b border-line bg-trust-light/40">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Badge variant="trust">Trust & Safety</Badge>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">
            Trust isn&rsquo;t a feature. It&rsquo;s how we&rsquo;re built.
          </h1>
          <p className="mt-4 text-lg text-ink-soft">
            Letting someone into your home or onto your property is a big deal. Here&rsquo;s exactly
            what we do — and what we&rsquo;re still building toward.
          </p>
        </div>
      </section>

      <section className="border-b border-line bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-line bg-paper-raised p-6">
                <p.icon className="h-6 w-6 text-trust" aria-hidden="true" />
                <h2 className="mt-4 font-display font-semibold text-ink">{p.title}</h2>
                <p className="mt-1.5 text-sm text-ink-soft">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-line bg-paper-raised">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-ink">An honest note on verification</h2>
          <p className="mt-4 text-ink-soft">
            We take it seriously when we say a Guy is &ldquo;verified.&rdquo; Verification status on a
            profile — identity verification, background-check status — only ever reflects what
            has actually been completed for that person. We don&rsquo;t display a badge or claim we
            can&rsquo;t stand behind. If a status hasn&rsquo;t been completed yet, the profile will say so
            plainly rather than implying otherwise.
          </p>
          <p className="mt-4 text-ink-soft">
            As the marketplace grows, we&rsquo;re continuing to invest in stronger verification,
            insurance options, and safety tooling for both customers and Guys.
          </p>
        </div>
      </section>

      <section className="bg-paper">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-ink">Something feels off?</h2>
          <p className="mt-2 text-ink-soft">
            Report a concern any time from a job in your account, or reach out and we&rsquo;ll help.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton href="/faq">Read the FAQ</LinkButton>
            <LinkButton href="/login" variant="outline">
              Go to my account
            </LinkButton>
          </div>
          <p className="mt-6 text-sm text-ink-soft">
            Read more about the request-to-payout flow on our{" "}
            <Link href="/how-it-works" className="font-medium text-brand hover:underline">
              how it works
            </Link>{" "}
            page.
          </p>
        </div>
      </section>
    </>
  );
}
