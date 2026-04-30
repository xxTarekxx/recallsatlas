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

export default async function GeneralRecallsIndexRoute({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialData = getGeneralRecallListPage({
    lang: "en",
    q: resolvedSearchParams?.q || "",
  });
  return (
    <GeneralRecallsSearchPage lang="en" initialQuery={resolvedSearchParams?.q} initialData={initialData} />
  );
}
