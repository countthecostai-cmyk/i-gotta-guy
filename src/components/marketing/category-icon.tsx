import { Trees, Sparkles, Truck, Wrench, Paintbrush, Wand2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  trees: Trees,
  sparkles: Sparkles,
  truck: Truck,
  wrench: Wrench,
  paintbrush: Paintbrush,
};

export function CategoryIcon({ icon, className }: { icon: string; className?: string }) {
  const Icon = ICONS[icon] ?? Wand2;
  return <Icon className={cn("h-5 w-5", className)} aria-hidden="true" />;
}
