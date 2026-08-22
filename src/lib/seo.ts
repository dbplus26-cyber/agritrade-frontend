import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";

/**
 * Shared per-page metadata builder.
 *
 * - `title` gets the brand suffix and is set `absolute` so it bypasses the
 *   root layout's title template.
 * - `path` is the self-referential canonical and the OG url (relative,
 *   resolved against `metadataBase`).
 * - The OG/Twitter image comes site-wide from `app/opengraph-image.tsx`, so it
 *   is intentionally not set here unless a page passes its own.
 */
interface PageMetaInput {
  title: string;
  description: string;
  /** Absolute path, e.g. "/about" - canonical + OG url. */
  path: string;
  keywords?: string[];
  /** Set false for placeholder/no-value pages. */
  index?: boolean;
  /** Page-specific OG/Twitter image (absolute URL). Omit to inherit. */
  image?: string;
}

// Search results truncate titles around 60 characters and social previews cut
// descriptions near 125 - clamp centrally so no page can overflow either.
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 125;

const clampTitle = (title: string): string => {
  const suffix = ` · ${siteConfig.name}`;
  const budget = MAX_TITLE - suffix.length;
  const page =
    title.length > budget ? `${title.slice(0, budget - 1).trimEnd()}…` : title;
  return `${page}${suffix}`;
};

const clampDescription = (description: string): string => {
  if (description.length <= MAX_DESCRIPTION) return description;
  // Cut on a word boundary so the ellipsis never splits a word.
  const slice = description.slice(0, MAX_DESCRIPTION - 1);
  const atWord = slice.slice(0, slice.lastIndexOf(" "));
  return `${(atWord || slice).trimEnd()}…`;
};

export function pageMetadata({
  title,
  description: rawDescription,
  path,
  keywords,
  index = true,
  image,
}: PageMetaInput): Metadata {
  const fullTitle = clampTitle(title);
  const description = clampDescription(rawDescription);
  const ogImage = image
    ? { url: image, width: 1200, height: 630, alt: fullTitle }
    : undefined;
  return {
    title: { absolute: fullTitle },
    description,
    keywords,
    alternates: { canonical: path },
    robots: index ? undefined : { index: false, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      type: "website",
      ...(ogImage ? { images: [ogImage] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
