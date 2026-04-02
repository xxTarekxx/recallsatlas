import CategoryRecallsPage from "@/components/fda/CategoryRecallsPage";

interface PageProps {
  params: { category: string };
}

export default async function CategoryPage({ params }: PageProps) {
  const categoryParam = decodeURIComponent(params.category);
  return <CategoryRecallsPage categoryParam={categoryParam} uiLang="en" />;
}
