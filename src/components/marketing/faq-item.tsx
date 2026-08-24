import { ChevronDown } from "lucide-react";

export function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group rounded-xl border border-line bg-paper-raised px-5 py-1 open:bg-paper-raised">
      <summary className="tap-target flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 font-display text-[15px] font-semibold text-ink marker:content-none">
        {question}
        <ChevronDown
          className="h-4 w-4 shrink-0 text-ink-soft transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <p className="pb-4 text-sm leading-relaxed text-ink-soft">{answer}</p>
    </details>
  );
}
