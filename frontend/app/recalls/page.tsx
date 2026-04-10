import RecallsSearchPage from "@/components/fda/RecallsSearchPage";
import { loadRecallsListPage } from "@/lib/recalls-list-data";

export default async function RecallsListPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const initialData = await loadRecallsListPage({
    page: 1,
    q: searchParams?.q,
    category: searchParams?.category,
    lang: "en",
  });

  return (
    <RecallsSearchPage
      lang="en"
      categorySlug={searchParams?.category}
      initialQuery={searchParams?.q}
      initialData={initialData}
    />
  );
}
