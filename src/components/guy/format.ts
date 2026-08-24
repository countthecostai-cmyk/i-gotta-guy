import { format, isToday, isTomorrow } from "date-fns";

export function formatJobDate(iso: string | null): string {
  if (!iso) return "Flexible timing";
  const d = new Date(iso);
  if (isToday(d)) return `Today, ${format(d, "h:mm a")}`;
  if (isTomorrow(d)) return `Tomorrow, ${format(d, "h:mm a")}`;
  return format(d, "EEE, MMM d 'at' h:mm a");
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy 'at' h:mm a");
}
