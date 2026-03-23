import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import "../styles/globals.css";
import "../styles/layout.css";
import "../styles/recall.css";
import "../styles/grid.css";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://recallsatlas.com";
const GA_ID = "G-96QD0HTTH6";
const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "RecallsAtlas | FDA & NHTSA Recall Search",
    template: "%s | RecallsAtlas",
  },
  description:
    "Search and browse U.S. FDA and NHTSA recalls with plain-language summaries and links to official government notices.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: siteUrl },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "RecallsAtlas | FDA & NHTSA Recall Search",
    description:
      "Search and browse U.S. FDA and NHTSA recalls with plain-language summaries and links to official government notices.",
    url: siteUrl,
    siteName: "RecallsAtlas",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "RecallsAtlas | FDA & NHTSA Recall Search",
    description:
      "Search and browse U.S. FDA and NHTSA recalls with plain-language summaries and links to official government notices.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <SiteNav />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
