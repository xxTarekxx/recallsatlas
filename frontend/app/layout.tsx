import type { Metadata } from "next";
import "../styles/globals.css";
import "../styles/layout.css";
import "../styles/recall.css";
import "../styles/grid.css";
import SiteFooter from "@/components/SiteFooter";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://recallsatlas.com";

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
      <body>
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
