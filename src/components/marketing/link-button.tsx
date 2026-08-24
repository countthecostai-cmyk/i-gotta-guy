import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Link styled as a Button. The shared <Button> primitive is a plain
 * <button> (no `asChild`/Slot support), so navigational CTAs in the
 * marketing site use this instead — same visual language, real <a> tags.
 */
const linkButtonVariants = cva(
  "tap-target inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand",
  {
    variants: {
      variant: {
        primary: "bg-brand text-white hover:bg-brand-dark shadow-sm",
        secondary: "bg-ink text-paper hover:bg-ink/90",
        outline: "border border-line bg-transparent text-ink hover:bg-ink/5",
        ghost: "text-ink hover:bg-ink/5",
        trust: "bg-trust text-white hover:bg-trust-dark",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5 text-[15px]",
        lg: "h-13 px-7 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface LinkButtonProps
  extends React.ComponentProps<typeof Link>,
    VariantProps<typeof linkButtonVariants> {}

export function LinkButton({ className, variant, size, href, ...props }: LinkButtonProps) {
  return (
    <Link href={href} className={cn(linkButtonVariants({ variant, size }), className)} {...props} />
  );
}
