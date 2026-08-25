/**
 * Computes the title to show for a job on cards and detail headers.
 *
 * Most services should just show their service name. But a service whose
 * `request_fields` capture what the customer is actually asking for in
 * their own words (keyed `job_title` by convention — see the "Something
 * Else" catch-all service) should surface that instead of the generic
 * service name, so a custom job listing reads as "Fix my fence gate"
 * rather than just "Something Else" everywhere in the Guy and customer
 * UIs. This is purely data-driven off the `job_title` key, not hardcoded
 * to any one service/slug — any future service can opt in the same way.
 */
export function jobDisplayTitle(details: unknown, serviceName: string): string {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const title = (details as Record<string, unknown>).job_title;
    if (typeof title === "string" && title.trim().length > 0) {
      return title.trim();
    }
  }
  return serviceName;
}
