/**
 * The foreign-matter weight deduction, mirroring the backend
 * `src/services/purchase/fm-deduction.ts`. Preview only: the server computes
 * the figure a supplier is actually paid on.
 *
 * Above the tolerance, the excess over the standard comes off the weight,
 * rounded to the whole kilo (64,735 kg at 3.96% against 3 / 3.5 loses 621 kg).
 */
export const fmDeduction = (args: {
  fmPercent: number | null;
  standardPct: number | null;
  tolerancePct: number | null;
  weightKg: number;
}): { kg: number; pct: number } => {
  const { fmPercent, standardPct, weightKg } = args;
  if (fmPercent === null || standardPct === null) return { kg: 0, pct: 0 };
  // Whole hundredths, so 3.96 - 3 is 0.96 and not 0.9599999.
  const excess = Math.round(fmPercent * 100) - Math.round(standardPct * 100);
  if (fmPercent <= (args.tolerancePct ?? standardPct) || excess <= 0) {
    return { kg: 0, pct: 0 };
  }
  return { kg: Math.round((weightKg * excess) / 10_000), pct: excess / 100 };
};
