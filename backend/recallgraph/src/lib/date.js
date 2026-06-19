const MONTHS = new Map(
  [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].map((month, index) => [month, index])
);

function normalizeDate(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.valueOf())) {
    return value.toISOString();
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();

  const match = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (match) {
    const month = MONTHS.get(match[1].toLowerCase());
    if (month !== undefined) {
      return new Date(Date.UTC(Number(match[3]), month, Number(match[2]))).toISOString();
    }
  }

  return null;
}

function dateOnly(value) {
  const normalized = normalizeDate(value);
  return normalized ? normalized.slice(0, 10) : null;
}

module.exports = { dateOnly, normalizeDate };
