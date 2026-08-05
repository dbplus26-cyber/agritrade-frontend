import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /style-guide is the internal component gallery; /api is not a page;
      // /admin is the private console and /agent the field app. Both already
      // set `robots: { index: false }` on their layout, which is the binding
      // signal - they are listed here too so one file answers "what is not
      // for the public" without reading every layout.
      disallow: ["/style-guide", "/api", "/admin", "/agent"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
