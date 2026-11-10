// test/unit/commodity-fm-rule.test.ts
//
// The FM rule on the commodity form is a pair. A tolerance with no standard,
// or one below it, saves as a rule that can never deduct anything - and a
// supplier is then paid in full on a load that failed its test.
import { describe, expect, it } from "vitest";

import { commoditySchema } from "@/validations/registry-schema";

const check = (fmStandardPct: string, fmTolerancePct: string) => {
  const result = commoditySchema.safeParse({
    name: "Soya Beans",
    fmStandardPct,
    fmTolerancePct,
  });
  return result.success
    ? "ok"
    : result.error.issues.map((i) => i.path.join(".")).join(",");
};

describe("commodity FM rule", () => {
  it.each([
    ["3", "3.5"],
    ["3", "3"],
    ["3", ""],
    ["", ""],
  ])("accepts standard %j with tolerance %j", (standard, tolerance) => {
    expect(check(standard, tolerance)).toBe("ok");
  });

  it("refuses a tolerance below the standard, on the tolerance field", () => {
    expect(check("3", "2.5")).toBe("fmTolerancePct");
  });

  it("refuses a tolerance with no standard", () => {
    expect(check("", "3.5")).toBe("fmTolerancePct");
  });
});
