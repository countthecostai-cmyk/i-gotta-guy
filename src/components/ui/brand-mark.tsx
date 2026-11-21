import { LOGO_DATA_URL } from "@/lib/brand/logo-data";
import { cn } from "@/lib/utils";

/**
 * The real I Gotta Guy Lawn Service logo (the palm-tree-over-grass circular
 * badge from Andre's flyer) — see src/lib/brand/logo-data.ts for why this is
 * an inlined data URI rather than a file under public/. This is the one
 * piece of visual brand identity used everywhere the plain site name used
 * to render as bare text.
 */
export function BrandIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URI, not a static asset next/image can optimize
    <img src={LOGO_DATA_URL} alt="I Gotta Guy" className={cn("inline-block shrink-0 object-contain", className)} />
  );
}

/**
 * The site wordmark. The logo artwork already spells out "I Gotta Guy" (and
 * "Lawn Service"), so by default this renders the logo alone — adding a
 * second, separate text label next to it would just duplicate what the
 * badge already says. Pass `showText` to also render a plain-text label
 * (useful for places like the footer where a secondary line of copy sits
 * right below it anyway).
 */
export function Wordmark({
  className,
  textClassName,
  iconClassName,
  showIcon = true,
  showText = false,
}: {
  className?: string;
  textClassName?: string;
  iconClassName?: string;
  showIcon?: boolean;
  showText?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {showIcon && <BrandIcon className={cn("h-10 w-10", iconClassName)} />}
      {showText && (
        <span className={cn("font-display font-extrabold tracking-tight text-ink", textClassName)}>
          I Gotta <span className="text-brand">Guy</span>
        </span>
      )}
      {!showText && <span className="sr-only">I Gotta Guy</span>}
    </span>
  );
}
