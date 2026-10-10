/** Random hex id from the Web Crypto API (works in every browsing context, unlike crypto.randomUUID). */
export function newKey(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
