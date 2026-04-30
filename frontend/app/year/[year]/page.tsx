import YearRecallsPage from "@/components/fda/YearRecallsPage";

interface PageProps {
  params: Promise<{ year: string }>;
}

export default async function YearPage({ params }: PageProps) {
  const { year } = await params;
  return <YearRecallsPage yearParam={year} uiLang="en" />;
}
