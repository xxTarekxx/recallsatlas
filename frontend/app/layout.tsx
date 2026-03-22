import type { Metadata } from "next";
import Script from "next/script";
import "../styles/globals.css";
import "../styles/layout.css";
import "../styles/recall.css";
import "../styles/grid.css";
import SiteFooter from "@/components/SiteFooter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://recallsatlas.com";
const GA_ID = "G-96QD0HTTH6";

export const metadata: Metadata = {
  title: "RecallsAtlas | FDA Recall Data",
  description: "Aggregate FDA recall data. Search and browse drug, food, medical device, and supplement recalls.",
  metadataBase: new URL(siteUrl),
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
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
