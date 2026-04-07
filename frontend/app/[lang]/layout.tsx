import { notFound } from "next/navigation";
import { isSiteUiLang } from "@/lib/siteLocale";

export default async function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  if (!isSiteUiLang(lang) || lang === "en") notFound();
  return children;
}
