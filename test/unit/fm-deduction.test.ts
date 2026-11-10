// The form's deduction preview must agree with the backend rule, checked
// against the owner's soybean book (standard 3%, tolerance 3.5%).
import { describe, expect, it } from "vitest";
import { fmDeduction } from "@/lib/fm-deduction";

const RULE = { standardPct: 3, tolerancePct: 3.5 };

describe("fmDeduction", () => {
  it("deducts the excess over the standard above the tolerance", () => {
    expect(fmDeduction({ ...RULE, fmPercent: 3.96, weightKg: 64_735 })).toEqual(
      { kg: 621, pct: 0.96 },
    );
    expect(fmDeduction({ ...RULE, fmPercent: 4.67, weightKg: 59_900 })).toEqual(
      { kg: 1000, pct: 1.67 },
    );
  });

  it("deducts nothing under the tolerance, untested, or with no rule", () => {
    expect(fmDeduction({ ...RULE, fmPercent: 3.17, weightKg: 54_565 }).kg).toBe(
      0,
    );
    expect(fmDeduction({ ...RULE, fmPercent: null, weightKg: 1000 }).kg).toBe(
      0,
    );
    expect(
      fmDeduction({
        fmPercent: 9,
        standardPct: null,
        tolerancePct: null,
        weightKg: 1000,
      }).kg,
    ).toBe(0);
  });
});
