/** Stable hue 0–359 from category file stem (e.g. `accessories`) for tag styling. */
export function generalRecallCategoryHue(categoryKey: string): number {
  let h = 2166136261;
  for (let i = 0; i < categoryKey.length; i++) {
    h ^= categoryKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 360;
}

/** `babies-and-kids` → "Babies and kids" */
export function formatGeneralRecallCategoryLabel(categoryKey: string): string {
  const s = categoryKey.trim();
  if (!s) return "";
  return s
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
