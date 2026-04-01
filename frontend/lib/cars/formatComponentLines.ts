/**
 * Split NHTSA-style component strings on colons so each clause can sit on its own line.
 * Keeps ":" at the end of each line except the last segment.
 */
export function formatComponentLines(raw: string): string[] {
  const s = String(raw ?? "").trim();
  if (!s) return [];
  if (!s.includes(":")) return [s];
  const parts = s
    .split(":")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length <= 1) return [s];
  return parts.map((p, i) => (i < parts.length - 1 ? `${p}:` : p));
}
