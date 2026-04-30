import RecallsSearchPage from "@/components/fda/RecallsSearchPage";
import { loadRecallsListPage } from "@/lib/recalls-list-data";

export default async function RecallsListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const initialData = await loadRecallsListPage({
    page: 1,
    q: resolvedSearchParams?.q,
    category: resolvedSearchParams?.category,
    lang: "en",
  });

  return (
    <RecallsSearchPage
      lang="en"
      categorySlug={resolvedSearchParams?.category}
      initialQuery={resolvedSearchParams?.q}
      initialData={initialData}
    />
  );
}
