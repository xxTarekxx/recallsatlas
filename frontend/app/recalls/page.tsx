import RecallsSearchPage from "@/components/fda/RecallsSearchPage";

export default function RecallsListPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  return (
    <RecallsSearchPage
      lang="en"
      categorySlug={searchParams?.category}
      initialQuery={searchParams?.q}
    />
  );
}
