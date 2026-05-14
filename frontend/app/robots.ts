import type { MetadataRoute } from "next";
import { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeo";

export default function robots(): MetadataRoute.Robots {
  const base = getVehicleRecallSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/recalls/preview/"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
