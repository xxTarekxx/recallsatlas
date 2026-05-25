import { normalizeVinInput } from "@/lib/vin";

export const LS_VIN = "recallsatlas_cars_vin";
export const LS_YEAR = "recallsatlas_cars_year";
export const LS_MAKE = "recallsatlas_cars_make";
export const LS_MODEL = "recallsatlas_cars_model";
export const SS_RESULTS = "recallsatlas_cars_last_results";
export const LS_VIN_HISTORY = "recallsatlas_cars_vin_history";
export const MAX_VIN_HISTORY = 30;
export const VIN_DATALIST_ID = "recallsatlas-vin-datalist";

export function loadVinHistoryFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_VIN_HISTORY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (x): x is string => typeof x === "string" && x.trim().length >= 8
    );
  } catch {
    return [];
  }
}

export function saveVinHistoryToStorage(list: string[]) {
  localStorage.setItem(LS_VIN_HISTORY, JSON.stringify(list.slice(0, MAX_VIN_HISTORY)));
}

export function addVinToHistory(list: string[], rawVin: string): string[] {
  const v = normalizeVinInput(rawVin);
  if (v.length < 8) return list;
  const without = list.filter((x) => x !== v);
  return [v, ...without].slice(0, MAX_VIN_HISTORY);
}

export function setOrRemoveLocalStorage(key: string, value: string) {
  const trimmed = value.trim();
  if (trimmed) localStorage.setItem(key, trimmed);
  else localStorage.removeItem(key);
}
