/**
 * Guards against a `javascript:`/`data:`/other script-executing URI being
 * stored as a "photo URL" (job_photos.url is free-text, pasted by any job
 * participant) and later rendered as an <a href> or <img src> for a
 * different user — a classic stored-XSS vector. Only allow http(s).
 */
export function isSafeImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
