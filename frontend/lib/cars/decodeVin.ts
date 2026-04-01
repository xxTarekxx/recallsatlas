export type DecodedVehicle = {
  year: string;
  make: string;
  model: string;
};

/** VPIC could not decode this VIN (invalid, incomplete, or no vehicle data). */
export class VinLookupNotFoundError extends Error {
  readonly vin: string;
  constructor(vin: string) {
    super("VIN_LOOKUP_NOT_FOUND");
    this.name = "VinLookupNotFoundError";
    this.vin = vin;
  }
}

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
    throw new VinLookupNotFoundError(normalizedVin);
  }

  const payload = await res.json();
  const row = Array.isArray(payload?.Results) ? payload.Results[0] : null;
  if (!row) {
    throw new VinLookupNotFoundError(normalizedVin);
  }

  const decoded = {
    year: clean(row.ModelYear),
    make: clean(row.Make),
    model: clean(row.Model),
  };

  if (!decoded.year || !decoded.make || !decoded.model) {
    throw new VinLookupNotFoundError(normalizedVin);
  }

  return decoded;
}

