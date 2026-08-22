import { describe, expect, it } from "vitest";

import {
  STATEMENT_SECTION_OPTIONS,
  statementSectionLabel,
} from "@/lib/statement-section";
import { expenseCategorySchema } from "@/validations/registry-schema";

// Where a category files is the one fact on this form the financial
// statements read. Unasked, every category files as running costs whatever
// it is.
describe("an expense category says where it files", () => {
  it("requires a section and takes the heading as optional", () => {
    const ok = expenseCategorySchema.safeParse({
      name: "Haulage",
      statementSection: "COST_OF_SALES",
    });
    expect(ok.success).toBe(true);

    const missing = expenseCategorySchema.safeParse({ name: "Haulage" });
    expect(missing.success).toBe(false);
  });

  it("offers every section the statements know, tax included", () => {
    // TAX is the one that matters most to get right: filed anywhere else, a
    // tax bill charges the year twice.
    expect(STATEMENT_SECTION_OPTIONS.map((o) => o.value).sort()).toEqual([
      "ADMINISTRATIVE",
      "COST_OF_SALES",
      "FINANCE",
      "TAX",
    ]);
    for (const value of ["ADMINISTRATIVE", "COST_OF_SALES", "FINANCE", "TAX"] as const) {
      expect(
        expenseCategorySchema.safeParse({ name: "Rent", statementSection: value })
          .success,
      ).toBe(true);
    }
    expect(
      expenseCategorySchema.safeParse({ name: "Rent", statementSection: "OTHER" })
        .success,
    ).toBe(false);
  });

  it("prints a section in the owner's words", () => {
    expect(statementSectionLabel("TAX")).toBe("Tax paid");
    expect(statementSectionLabel("COST_OF_SALES")).toBe("Cost of the goods sold");
  });
});
