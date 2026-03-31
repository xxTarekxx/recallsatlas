export type DecodedVehicle = {
  year: string;
  make: string;
  model: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function decodeVin(vin: string): Promise<DecodedVehicle> {
  const normalizedVin = clean(vin).toUpperCase();
  if (!normalizedVin) {
    throw new Error("VIN is required.");
  }

  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvaluesextended/${encodeURIComponent(normalizedVin)}?format=json`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`VIN decode request failed (${res.status}).`);
  }

  const payload = await res.json();
  const row = Array.isArray(payload?.Results) ? payload.Results[0] : null;
  if (!row) {
    throw new Error("VIN decode returned no result.");
  }

  const decoded = {
    year: clean(row.ModelYear),
    make: clean(row.Make),
    model: clean(row.Model),
  };

  if (!decoded.year || !decoded.make || !decoded.model) {
    throw new Error("VIN decode response is missing year/make/model.");
  }

  return decoded;
}

