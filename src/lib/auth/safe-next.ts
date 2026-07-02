// Only allow same-site relative paths -- `next` round-trips through a query
// param an attacker could craft (e.g. /login?next=https://evil.com), so
// navigating to a bare `next` would be an open redirect.
export function safeNext(next: string | null): string {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return next
  }
  return "/dashboard"
}
