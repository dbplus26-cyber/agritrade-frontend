/**
 * URL slugs for the public detail pages.
 *
 * Both registers already carry something unique to key a page on, so nothing
 * new has to be stored: a commodity's name is unique case-insensitively, and a
 * plot's register reference ("TML-014") is unique by construction. Slugging
 * those keeps the URLs readable - /commodities/white-maize, /land/tml-014 -
 * without a slug column that could drift out of step with the record.
 */

/**
 * Lower-case, hyphenated, ASCII-safe. Accented letters are folded rather than
 * dropped, so "Théophile" stays "theophile" instead of "thophile".
 */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Find the one record a slug points at.
 *
 * Comparison is on the slug of each candidate, not on the raw field: two
 * records can only collide here if they already collide in the register, which
 * the unique constraints prevent.
 */
export function findBySlug<T>(
  items: T[],
  slug: string,
  key: (item: T) => string,
): T | undefined {
  const wanted = slugify(slug);
  return items.find((item) => slugify(key(item)) === wanted);
}
