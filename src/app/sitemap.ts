import type { MetadataRoute } from "next";
import { fetchPublicCommodities, toLots } from "@/lib/public-commodities";
import { fetchPublicLandPlots, plotSlug } from "@/lib/public-land";
import { routes } from "@/lib/routes";
import { siteUrl } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Every published commodity and plot has a page of its own now. Both reads
  // are the cached public feeds, so the sitemap costs no extra request and
  // follows the same purge as the pages it lists. A down API simply yields no
  // detail entries rather than failing the sitemap.
  const [lots, plots] = await Promise.all([
    fetchPublicCommodities().then(toLots),
    fetchPublicLandPlots().then((p) => p ?? []),
  ]);
  // /pay is transactional (noindex) and /style-guide is internal — only the
  // real content pages are listed.
  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}${routes.commodities}`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}${routes.land}`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}${routes.farmingInvestment}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}${routes.about}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}${routes.reviews}`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}${routes.contact}`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}${routes.terms}`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    { url: `${siteUrl}${routes.privacy}`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ...lots.map((lot) => ({
      url: `${siteUrl}${routes.commodity(lot.slug)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...plots.map((plot) => ({
      url: `${siteUrl}${routes.plot(plotSlug(plot))}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
