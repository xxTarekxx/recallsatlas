/** NHTSA-style VIN: 17 chars, no I, O, or Q. */
export function normalizeVinInput(raw: string): string {
  return raw.replace(/\s/g, "").toUpperCase();
}

export function isLikelyVin17(raw: string): boolean {
  const v = normalizeVinInput(raw);
  return /^[A-HJ-NPR-Z0-9]{17}$/.test(v);
}
