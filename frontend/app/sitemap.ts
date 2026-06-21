import type { MetadataRoute } from "next";
import { getVehicleRecallSiteBaseUrl } from "@/lib/cars/vehicleRecallSeo";

/** Always return the current indexable surface. Recall detail pages are noindexed. */
export const dynamic = "force-dynamic";

const STATIC_HOME_PRIORITY = 1;
const STATIC_SECTION_PRIORITY = 0.85;
const STATIC_RECALLGRAPH_PRIORITY = 0.9;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getVehicleRecallSiteBaseUrl();
  const staticNow = new Date();

  return [
    { url: base, lastModified: staticNow, priority: STATIC_HOME_PRIORITY },
    { url: `${base}/recallgraph`, lastModified: staticNow, priority: STATIC_RECALLGRAPH_PRIORITY },
    { url: `${base}/recallgraph/search`, lastModified: staticNow, priority: STATIC_RECALLGRAPH_PRIORITY },
    { url: `${base}/recallgraph/dashboard`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/recallgraph/evaluation`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/about`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/methodology`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/how-to-check-recalls`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/contact`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/privacy`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/recalls`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/cars`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/general-recalls`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/brand`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
    { url: `${base}/year`, lastModified: staticNow, priority: STATIC_SECTION_PRIORITY },
  ];
}
