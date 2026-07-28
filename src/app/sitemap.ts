import type { MetadataRoute } from "next";
import { routes } from "@/lib/routes";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
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
  ];
}
