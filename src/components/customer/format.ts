import { format, formatDistanceToNow, isToday, isTomorrow } from "date-fns";

/** Friendly relative/absolute date formatting shared across the customer dashboard. */
export function formatJobDate(iso: string | null): string {
  if (!iso) return "Not scheduled yet";
  const date = new Date(iso);
  if (isToday(date)) return `Today, ${format(date, "h:mm a")}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, "h:mm a")}`;
  return format(date, "EEE, MMM d 'at' h:mm a");
}

export function formatRelativeTime(iso: string): string {
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}
