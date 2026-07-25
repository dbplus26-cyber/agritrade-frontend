// src/config/cache-tags.ts
//
// Cache tags this app's public pages fetch under, and the vocabulary the
// POST /api/revalidate endpoint accepts. The names are a cross-repo contract
// with agritrade-backend/src/config/cache-tags.ts: the backend broadcasts a
// tag list after every successful admin write, and this app purges the tags
// it recognises, reporting the rest as skipped.
export const CACHE_TAGS = {
  /** Public commodity availability (/ board + /commodities lot files). */
  COMMODITIES: "commodities",
  /** Public contact block (phone/WhatsApp/email/address), owner-editable. */
  CONTACT: "contact",
  /** Public land listings (/land plot register). */
  LAND_PLOTS: "land-plots",
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export const ALL_CACHE_TAGS: ReadonlySet<string> = new Set(
  Object.values(CACHE_TAGS),
);
