import AboutPageContent from "@/components/AboutPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Recalls Atlas – Independent FDA Recall Aggregator",
  description:
    "Recalls Atlas is an independent aggregator of FDA and NHTSA recall data. Learn about our mission, data sources, and how to contact us.",
  alternates: { canonical: "https://www.recallsatlas.com/about" },
};

export default function AboutPage() {
  return <AboutPageContent lang="en" />;
}
