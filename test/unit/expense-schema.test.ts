// test/unit/expense-schema.test.ts
//
// Recording a cost now moves money in the same act, so the form carries the
// payment rules the settlement screen used to carry alone. The two that matter
// are the two the server refuses on (ACCOUNT_REQUIRED, REFERENCE_REQUIRED): a
// bank or mobile-money payment has to say which account it moved on and quote
// the reference the statement will be matched against. Cash needs neither -
// it leaves the office till, which has nothing to quote - and demanding either
// there would be inventing a rule nobody can satisfy.
//
// Tested at the schema rather than through the dialog: these are the rules,
// the dialog only renders them.
import { describe, expect, it } from "vitest";

import { expenseSchema } from "@/validations/expense-schema";

const COST = {
  amountGhs: "850.00",
  categoryId: "6f9b6f6e-0f6a-4c3a-9a1e-2c9f0e2b7a11",
  description: "Warehouse rent, July",
  incurredAt: "2026-08-01",
  method: "CASH" as const,
  paidNow: true,
  paymentAccountId: "",
  reference: "",
};

/** The `path` of every issue a parse raised, for terse assertions. */
const issuePaths = (input: unknown): string[] => {
  const result = expenseSchema.safeParse(input);
  return result.success ? [] : result.error.issues.map((i) => String(i.path[0]));
};

describe("expenseSchema", () => {
  it("accepts a cash cost paid in the same act, with no account named", () => {
    expect(expenseSchema.safeParse(COST).success).toBe(true);
  });

  it("accepts a cost recorded to be paid later", () => {
    expect(
      expenseSchema.safeParse({ ...COST, method: "BANK", paidNow: false })
        .success,
    ).toBe(true);
  });

  it("makes a transfer name its account and quote its reference", () => {
    const paths = issuePaths({ ...COST, method: "BANK" });
    expect(paths).toContain("paymentAccountId");
    expect(paths).toContain("reference");

    expect(
      expenseSchema.safeParse({
        ...COST,
        method: "MOMO",
        paymentAccountId: "3d0c9f0e-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
        reference: "TRF884512",
      }).success,
    ).toBe(true);
  });

  it("still refuses a cost with no figure, no category or a future date", () => {
    expect(issuePaths({ ...COST, amountGhs: "0" })).toContain("amountGhs");
    expect(issuePaths({ ...COST, categoryId: "" })).toContain("categoryId");
    expect(issuePaths({ ...COST, incurredAt: "2099-01-01" })).toContain(
      "incurredAt",
    );
  });
});
