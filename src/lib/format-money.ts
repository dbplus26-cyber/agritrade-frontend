/**
 * What a money field reads as when the API redacted it (financial visibility).
 * A visible placeholder, never a blank: "nothing here" and "not for you" must
 * not look the same to someone reading a ledger.
 */
export const MONEY_HIDDEN = "Hidden";

/**
 * Console tables state money in MAJOR units (e.g. price/kg 4.20).
 *
 * Accepts null because every money field on the wire is nullable: the API
 * strips prices, totals and balances for staff without financial visibility
 * (design doc 8.3). Formatting is therefore the one place redaction has to be
 * handled, and every call site gets it for free.
 */
export function formatCedis(major: number | null, currency = "GH₵"): string {
  if (major === null) return MONEY_HIDDEN;
  return `${currency} ${major.toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "12,400 kg" - weights across the console. */
export function formatKg(kg: number): string {
  return `${kg.toLocaleString("en-GH")} kg`;
}

/**
 * A money figure short enough to survive a stat tile on a 280px phone.
 *
 * Below 100k the exact amount fits, so it is shown in full. Above that the
 * figure is compacted (GH₵ 344.7k, GH₵ 1.2M) because the alternative is what
 * this replaces: "GH₵ 344,680.6…" clipped mid-number, which is worse than
 * rounded - a truncated figure reads as a DIFFERENT, smaller amount.
 *
 * Always pair with `formatCedis` in a `title` attribute so the exact value is
 * one hover (or one detail page) away.
 */
export function formatCedisCompact(major: number | null, currency = "GH₵"): string {
  if (major === null) return MONEY_HIDDEN;
  const abs = Math.abs(major);
  if (abs < 100_000) return formatCedis(major, currency);
  const [divisor, suffix] =
    abs >= 1_000_000_000
      ? [1_000_000_000, "B"]
      : abs >= 1_000_000
        ? [1_000_000, "M"]
        : [1_000, "k"];
  const scaled = major / divisor;
  // One decimal below 100 of the unit (344.7k), none above (1,204k) - keeps
  // every compacted figure to at most 8 characters.
  const digits = Math.abs(scaled) < 100 ? 1 : 0;
  return `${currency} ${scaled.toLocaleString("en-GH", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })}${suffix}`;
}

/**
 * A Tailwind size class chosen from how long the rendered figure is, so a
 * headline number shrinks rather than clipping or wrapping. Used by the
 * dashboard KPI tiles, where the tile width is fixed by the grid and the
 * content is not.
 */
export function statValueCls(text: string): string {
  if (text.length <= 9) return "text-[20px]";
  if (text.length <= 12) return "text-[17px]";
  if (text.length <= 16) return "text-[15px]";
  return "text-[13.5px]";
}
