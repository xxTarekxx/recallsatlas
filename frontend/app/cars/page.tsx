"use client";

import { Suspense } from "react";
import CarsLookupPage from "@/components/vehicle/cars/CarsLookupPage";
import styles from "./cars.module.css";

export default function CarsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <p>Loading...</p>
        </div>
      }
    >
      <CarsLookupPage />
    </Suspense>
  );
}
