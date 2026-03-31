export type CarRecall = {
  campaignNumber: string;
  summary: string;
  consequence: string;
  remedy: string;
  component: string;
  reportDate: string;
};

export type CarRecallParams = {
  make: string;
  model: string;
  year: string | number;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeParams(params: CarRecallParams) {
  const make = encodeURIComponent(clean(params.make).toUpperCase());
  const model = encodeURIComponent(clean(params.model).toUpperCase());
  const year = Number(clean(params.year));

  if (!make || !model || !Number.isFinite(year)) {
    throw new Error("make, model, and year are required.");
  }

  return { make, model, year };
}

export async function fetchCarRecalls(params: CarRecallParams): Promise<CarRecall[]> {
  const normalized = normalizeParams(params);
  const url =
    `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${normalized.make}` +
    `&model=${normalized.model}&modelYear=${normalized.year}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Vehicle recalls request failed (${res.status}).`);
  }

  const payload = await res.json();
  const rows = Array.isArray(payload?.results) ? payload.results : [];

  return rows
    .map((row: any) => ({
      campaignNumber: clean(row?.NHTSACampaignNumber),
      summary: clean(row?.Summary),
      consequence: clean(row?.Consequence),
      remedy: clean(row?.Remedy),
      component: clean(row?.Component),
      reportDate: clean(row?.ReportReceivedDate),
    }))
    .filter((recall: CarRecall) => Boolean(recall.campaignNumber));
}

