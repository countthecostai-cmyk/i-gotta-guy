/** True for an internal, same-origin path only — rejects protocol-relative
 * ("//evil.com") and backslash-based ("/\evil.com", which some browsers
 * normalize to "//evil.com") open-redirect payloads. */
export function isSafeInternalPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\");
}

/**
 * Maps a role to its home surface. The role itself should come from a
 * server-side source (e.g. signIn()'s return value, or a server component's
 * own profile lookup) rather than a client-side Supabase call — see
 * signIn() in lib/actions/auth.ts for why.
 */
export function roleHome(role: "customer" | "guy" | "admin"): string {
  if (role === "admin") return "/admin";
  if (role === "guy") return "/guy";
  return "/app";
}
