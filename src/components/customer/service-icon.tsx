import { Trees, Sparkles, Truck, Wrench, Paintbrush, Package, type LucideIcon } from "lucide-react";

/**
 * Maps the data-driven `service_categories.icon` string to a Lucide icon.
 * Unknown/future icon keys fall back to a generic package icon so new
 * categories never break rendering — no code change required to add one.
 */
const ICON_MAP: Record<string, LucideIcon> = {
  trees: Trees,
  sparkles: Sparkles,
  truck: Truck,
  wrench: Wrench,
  paintbrush: Paintbrush,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICON_MAP[icon] ?? Package;
  return <Icon className={className} aria-hidden="true" />;
}
