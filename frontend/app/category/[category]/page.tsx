import CategoryRecallsPage from "@/components/fda/CategoryRecallsPage";

interface PageProps {
  params: Promise<{ category: string }>;
}

export default async function CategoryPage({ params }: PageProps) {
  const { category } = await params;
  const categoryParam = decodeURIComponent(category);
  return <CategoryRecallsPage categoryParam={categoryParam} uiLang="en" />;
}
