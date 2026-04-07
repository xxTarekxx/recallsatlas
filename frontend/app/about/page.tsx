import AboutPageContent from "@/components/AboutPageContent";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Recalls Atlas – FDA, NHTSA & CPSC Recall Information",
  description:
    "Recalls Atlas aggregates public recall data from the FDA, NHTSA, and CPSC. Learn about our mission, sources, disclaimers, and how to contact us.",
  alternates: { canonical: "https://www.recallsatlas.com/about" },
};

export default function AboutPage() {
  return <AboutPageContent lang="en" />;
}
