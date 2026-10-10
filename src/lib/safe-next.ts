/** Only same-site relative paths are allowed as post-login destinations (prevents open redirects). */
export function safeNext(next: unknown, fallback: string): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
