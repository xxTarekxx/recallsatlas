import GeneralRecallsSearchPage from "@/components/general-recalls/GeneralRecallsSearchPage";
import { getGeneralRecallListPage } from "@/lib/general-recalls-data";
import { HOME_COPY } from "@/lib/homeCopy";
import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.recallsatlas.com";

export const metadata: Metadata = {
  title: HOME_COPY.en.generalTitle,
  description:
    "Browse thousands of U.S. Consumer Product Safety Commission (CPSC) recalls—toys, appliances, furniture, sports equipment, and more.",
  alternates: { canonical: `${siteUrl}/general-recalls` },
};

export default function GeneralRecallsIndexRoute({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const initialData = getGeneralRecallListPage({
    lang: "en",
    q: searchParams?.q || "",
  });
  return (
    <GeneralRecallsSearchPage lang="en" initialQuery={searchParams?.q} initialData={initialData} />
  );
}
