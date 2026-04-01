import RecallsSearchPage from "@/components/RecallsSearchPage";

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
