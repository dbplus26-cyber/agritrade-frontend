/**
 * Shared date/time formatting for the console. Records are time sensitive, so
 * the standard display shows the date AND the time (e.g. "12 Jul 2026, 14:30").
 * The per-module `format*Date` helpers all delegate here so the whole console
 * reads dates the same way.
 */

/** Date + time, e.g. "12 Jul 2026, 14:30". Blank for a missing value. */
export function formatDateTime(iso: null | string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Table date line, e.g. "Jul 12, 2026". Data tables stack this over
 * `formatTableTime` (dms-frontend pattern); detail pages keep the older
 * single-line helpers above.
 */
export function formatTableDate(iso: null | string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Table time line, e.g. "2:30 PM". Pairs with `formatTableDate`. */
export function formatTableTime(iso: null | string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
  });
}

/** Date only, e.g. "12 Jul 2026". For places where a time would be noise. */
export function formatDateOnly(iso: null | string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
