// test/unit/purchase-cost-schema.test.ts
//
// The client half of `purchaseExpenseSchema` (agritrade-backend
// src/validations/purchase-validation.ts). Two of these rules matter more than
// the rest:
//
//   * the amount is held as a STRING and must be pesewa-exact, because the
//     column is Decimal(14,2) and a third decimal is silently truncated
//     server-side into a figure nobody typed;
//   * `capitalise` has no default here even though the server defaults it to
//     true. The whole point of the field is that a person chose, and a form
//     that can submit without one has decided something unchangeable on their
//     behalf.
import { describe, expect, it } from "vitest";

import { purchaseCostSchema } from "@/validations/purchase-schema";

const valid = {
  amountGhs: "400.00",
  capitalise: true,
  categoryId: "cat-haulage",
  description: "Haulage, Kpandai to Tamale",
  incurredAt: "2026-07-11",
};

const parse = (over: Partial<typeof valid> = {}) =>
  purchaseCostSchema.safeParse({ ...valid, ...over });

const messages = (result: ReturnType<typeof parse>) =>
  result.success ? [] : result.error.issues.map((i) => i.message);

describe("purchaseCostSchema", () => {
  it("takes a cost with a treatment chosen", () => {
    expect(parse().success).toBe(true);
  });

  it("takes the not-into-the-goods treatment too", () => {
    expect(parse({ capitalise: false }).success).toBe(true);
  });

  it("refuses a third decimal place", () => {
    expect(messages(parse({ amountGhs: "400.005" }))).toContain(
      "Amounts are recorded to 2 decimal places (pesewas)",
    );
  });

  it("refuses zero and negative amounts", () => {
    expect(parse({ amountGhs: "0" }).success).toBe(false);
    expect(parse({ amountGhs: "-40" }).success).toBe(false);
  });

  it("refuses an amount past the server's ceiling", () => {
    expect(parse({ amountGhs: "10000000.01" }).success).toBe(false);
  });

  it("needs a category", () => {
    expect(messages(parse({ categoryId: "" }))).toContain("Choose a category");
  });

  it("refuses a date that has not happened yet", () => {
    const nextYear = new Date(Date.now() + 400 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(messages(parse({ incurredAt: nextYear }))).toContain(
      "That date is in the future - check the year",
    );
  });

  it("lets the description be left out", () => {
    expect(parse({ description: "" }).success).toBe(true);
  });
});
