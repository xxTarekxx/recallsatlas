import YearRecallsPage from "@/components/YearRecallsPage";

interface PageProps {
  params: { year: string };
}

export default async function YearPage({ params }: PageProps) {
  return <YearRecallsPage yearParam={params.year} uiLang="en" />;
}
