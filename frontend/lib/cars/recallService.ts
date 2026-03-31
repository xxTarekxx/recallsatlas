import { decodeVin } from "./decodeVin";
import { fetchCarRecalls, type CarRecall } from "./fetchCarRecalls";

export type CarRecallInput = {
  vin?: string;
  year?: string | number;
  make?: string;
  model?: string;
};

export type CarRecallResult = {
  vehicle: {
    year: string;
    make: string;
    model: string;
  };
  recalls: CarRecall[];
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

export async function getCarRecalls(input: CarRecallInput): Promise<CarRecallResult> {
  let vehicle: { year: string; make: string; model: string };

  if (clean(input.vin)) {
    vehicle = await decodeVin(clean(input.vin));
  } else {
    vehicle = {
      year: clean(input.year),
      make: clean(input.make),
      model: clean(input.model),
    };
  }

  if (!vehicle.year || !vehicle.make || !vehicle.model) {
    throw new Error("Provide vin OR year + make + model.");
  }

  const recalls = await fetchCarRecalls(vehicle);
  return { vehicle, recalls };
}

