import RecallsSearchPage from "@/components/fda/RecallsSearchPage";

export default async function RecallsListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const sp = await searchParams;
  return (
    <RecallsSearchPage
      lang="en"
      categorySlug={sp?.category}
      initialQuery={sp?.q}
    />
  );
}
