import type { Metadata } from "next";
import { FaqItem } from "@/components/marketing/faq-item";
import { LinkButton } from "@/components/marketing/link-button";
import { FAQS } from "@/lib/marketing/content";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Frequently asked questions about requesting a service or becoming a Guy on I Gotta Guy.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink">
        Frequently asked questions
      </h1>
      <p className="mt-3 text-lg text-ink-soft">
        Everything you need to know before requesting a service or becoming a Guy.
      </p>

      <div className="mt-10 space-y-3">
        {FAQS.map((faq) => (
          <FaqItem key={faq.question} question={faq.question} answer={faq.answer} />
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-line bg-paper-raised p-6 text-center">
        <h2 className="font-display text-lg font-semibold text-ink">Still have a question?</h2>
        <p className="mt-1.5 text-sm text-ink-soft">
          Sign in and reach out to support from any job, or get started below.
        </p>
        <div className="mt-4 flex flex-col justify-center gap-3 sm:flex-row">
          <LinkButton href="/signup">Get started</LinkButton>
          <LinkButton href="/login" variant="outline">
            Log in
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
