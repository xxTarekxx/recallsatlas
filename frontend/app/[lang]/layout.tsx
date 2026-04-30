import { notFound } from "next/navigation";
import { isSiteUiLang } from "@/lib/siteLocale";
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

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
