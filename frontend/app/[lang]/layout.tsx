import { notFound } from "next/navigation";
import { isSiteUiLang } from "@/lib/siteLocale";

export default function LangLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: { lang: string };
}>) {
  if (!isSiteUiLang(params.lang) || params.lang === "en") notFound();
  return children;
}
