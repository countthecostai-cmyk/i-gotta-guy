import { Card } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sublabel,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "default" | "trust" | "danger" | "brand";
  className?: string;
}) {
  const toneStyles: Record<string, string> = {
    default: "text-ink",
    trust: "text-trust-dark",
    danger: "text-danger",
    brand: "text-brand-dark",
  };
  return (
    <Card className={cn("p-5", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={cn("mt-1.5 font-display text-2xl font-bold", toneStyles[tone])}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-ink-soft">{sublabel}</p>}
    </Card>
  );
}
