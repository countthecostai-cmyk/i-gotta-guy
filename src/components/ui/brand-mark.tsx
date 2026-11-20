import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Small green "sprout" mark used alongside the text wordmark across every
 * header/footer in the app — the one piece of visual brand identity beyond
 * the type treatment, echoing the lawn/plant motif from the I Gotta Guy
 * Lawn Service logo without reproducing that artwork directly.
 */
export function BrandIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-brand text-white",
        className,
      )}
    >
      <Sprout className="h-[60%] w-[60%]" strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

/**
 * The "I Gotta Guy" wordmark: brand icon + text, with "Guy" picked out in
 * brand green. Used everywhere the plain site name used to appear so the
 * icon mark stays consistent across marketing, auth, customer, Guy, and
 * admin surfaces.
 */
export function Wordmark({
  className,
  textClassName,
  iconClassName,
  showIcon = true,
}: {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  showIcon?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showIcon && <BrandIcon className={cn("h-7 w-7", iconClassName)} />}
      <span className={cn("font-display font-extrabold tracking-tight text-ink", textClassName)}>
        I Gotta <span className="text-brand">Guy</span>
      </span>
    </span>
  );
}
