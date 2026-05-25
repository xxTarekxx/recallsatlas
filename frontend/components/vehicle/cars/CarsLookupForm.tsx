import type { FormEvent, RefObject } from "react";
import type { CarsPageUi } from "@/lib/cars/carsPageUi";
import { VIN_DATALIST_ID } from "@/lib/cars/carsLookupStorage";
import styles from "@/app/cars/cars.module.css";

type Props = {
  loading: boolean;
  make: string;
  model: string;
  onSearch: (e: FormEvent) => void;
  pageDir: "ltr" | "rtl";
  persistMakeOnly: () => void;
  persistModelOnly: () => void;
  persistVinOnly: () => void;
  persistYearOnly: () => void;
  selectedLang: string;
  setMake: (value: string) => void;
  setModel: (value: string) => void;
  setVin: (value: string) => void;
  setYear: (value: string) => void;
  ui: CarsPageUi;
  vin: string;
  vinHistory: string[];
  vinInputRef: RefObject<HTMLInputElement | null>;
  year: string;
};

export default function CarsLookupForm({
  loading,
  make,
  model,
  onSearch,
  pageDir,
  persistMakeOnly,
  persistModelOnly,
  persistVinOnly,
  persistYearOnly,
  selectedLang,
  setMake,
  setModel,
  setVin,
  setYear,
  ui,
  vin,
  vinHistory,
  vinInputRef,
  year,
}: Props) {
  return (
    <form
      className={styles.formCard}
      dir={pageDir}
      lang={selectedLang}
      onSubmit={onSearch}
      autoComplete="on"
      name="vehicle_recall_lookup"
    >
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="vin">
            {ui.labelVin}
          </label>
          <datalist id={VIN_DATALIST_ID}>
            {vinHistory.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <input
            ref={vinInputRef}
            id="vin"
            name="vin"
            className={styles.input}
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            onBlur={persistVinOnly}
            placeholder={ui.placeholderVin}
            list={VIN_DATALIST_ID}
            autoComplete="on"
            inputMode="text"
            maxLength={17}
            spellCheck={false}
            aria-describedby="vin-suggestions-hint"
            dir="ltr"
            lang="en"
          />
          <p id="vin-suggestions-hint" className={styles.fieldHint}>
            {ui.vinHint}
          </p>
        </div>

        <div className={styles.divider}>{ui.dividerOr}</div>

        <div className={styles.row3}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="year">
              {ui.labelYear}
            </label>
            <input
              id="year"
              name="vehicle_year"
              className={styles.input}
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder={ui.placeholderYear}
              autoComplete="on"
              onBlur={persistYearOnly}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="make">
              {ui.labelMake}
            </label>
            <input
              id="make"
              name="vehicle_make"
              className={styles.input}
              type="text"
              value={make}
              onChange={(e) => setMake(e.target.value)}
              placeholder={ui.placeholderMake}
              autoComplete="on"
              onBlur={persistMakeOnly}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="model">
              {ui.labelModel}
            </label>
            <input
              id="model"
              name="vehicle_model"
              className={styles.input}
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={ui.placeholderModel}
              autoComplete="on"
              onBlur={persistModelOnly}
            />
          </div>
        </div>

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? ui.searchButtonSearching : ui.searchButton}
        </button>
      </div>
    </form>
  );
}
