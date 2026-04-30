import { notFound } from "next/navigation";
import { isSiteUiLang } from "@/lib/siteLocale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
