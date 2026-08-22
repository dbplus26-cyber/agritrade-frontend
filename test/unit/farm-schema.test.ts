// test/unit/farm-schema.test.ts
//
// The two things the farming-investment book has to be able to say.
//
// A grant is money the business spent funding a farmer, so it names the
// account that funded it, or says why no company money moved, and never both
// (CASH_SOURCE_AMBIGUOUS / CASH_SOURCE_REQUIRED). A grant naming no account at
// all leaves the financial statement counting the outstanding grant as a
// receivable and reading it as cash gone, while the cash book says every
// account is untouched.
//
// A repayment arrives in one of two shapes and the shapes do not mix
// (REPAYMENT_SHAPE): a farmer who had a bad season settles in cash, and a cash
// repayment carrying a commodity, a weight and a rate would put grain the
// farmer never delivered into the season's yield.
//
// Tested at the schema rather than through the forms on purpose: these are the
// rules, the forms only render them. The backend refuses the same mistakes, but
// a refusal that arrives after the save is a worse way to learn them.
import { describe, expect, it } from "vitest";

import { grantSchema, repaymentSchema } from "@/validations/farm-schema";

const ACCOUNT = "0f6a4f1e-6a7a-4a1f-9f4e-1f2c3d4e5f60";

const GRANT = {
  cashSource: "ACCOUNT" as const,
  farmerId: "farmer-1",
  itemId: "item-1",
  paymentAccountId: ACCOUNT,
  quantity: "10",
  seasonId: "season-1",
  valueGhs: "1200",
};

const PRODUCE = {
  commodityId: "commodity-1",
  farmerId: "farmer-1",
  kind: "PRODUCE" as const,
  ratePerKgGhs: "4.20",
  seasonId: "season-1",
  weightKg: "900",
};

const CASH = {
  amountGhs: "1500",
  farmerId: "farmer-1",
  kind: "CASH" as const,
  paymentAccountId: ACCOUNT,
  seasonId: "season-1",
};

/** The `path` of every issue a parse raised, for terse assertions. */
const issuePaths =
  (schema: { safeParse: (v: unknown) => unknown }) =>
  (input: unknown): string[] => {
    const result = schema.safeParse(input) as
      | { error: { issues: { path: PropertyKey[] }[] }; success: false }
      | { success: true };
    return result.success
      ? []
      : result.error.issues.map((i) => String(i.path[0]));
  };

const grantIssues = issuePaths(grantSchema);
const repaymentIssues = issuePaths(repaymentSchema);

describe("grantSchema", () => {
  it("accepts a grant that names the account that funded it", () => {
    expect(grantIssues(GRANT)).toEqual([]);
  });

  it("accepts a grant that says why no company money moved", () => {
    // The real second answer: grant inputs frequently come out of stock the
    // business already paid for, where posting again spends the same cedi
    // twice.
    expect(
      grantIssues({
        ...GRANT,
        cashSource: "NONE",
        noCashReason: "Inputs came from the store",
        paymentAccountId: undefined,
      }),
    ).toEqual([]);
  });

  it("refuses a grant that names neither", () => {
    expect(grantIssues({ ...GRANT, paymentAccountId: undefined })).toEqual([
      "paymentAccountId",
    ]);
    expect(grantIssues({ ...GRANT, cashSource: "NONE" })).toEqual([
      "noCashReason",
    ]);
  });

  it("refuses a reason too short to be one", () => {
    expect(
      grantIssues({ ...GRANT, cashSource: "NONE", noCashReason: "x" }),
    ).toEqual(["noCashReason"]);
  });

  it("keeps the reason inside the column it is stored in", () => {
    expect(
      grantIssues({
        ...GRANT,
        cashSource: "NONE",
        noCashReason: "x".repeat(301),
      }),
    ).toEqual(["noCashReason"]);
    expect(
      grantIssues({
        ...GRANT,
        cashSource: "NONE",
        noCashReason: "x".repeat(300),
      }),
    ).toEqual([]);
  });
});

describe("repaymentSchema", () => {
  it("accepts produce: a crop, a weight and the rate it was valued at", () => {
    expect(repaymentIssues(PRODUCE)).toEqual([]);
  });

  it("accepts cash: an amount and the account it landed in", () => {
    expect(repaymentIssues(CASH)).toEqual([]);
  });

  it("asks a produce repayment for the crop, the weight and the rate", () => {
    expect(
      repaymentIssues({
        ...PRODUCE,
        commodityId: "",
        ratePerKgGhs: "",
        weightKg: "",
      }),
    ).toEqual(["commodityId", "weightKg", "ratePerKgGhs"]);
  });

  it("asks a cash repayment for the amount and the account", () => {
    expect(
      repaymentIssues({ ...CASH, amountGhs: "", paymentAccountId: "" }),
    ).toEqual(["amountGhs", "paymentAccountId"]);
  });

  it("refuses a cash repayment carrying a crop, a weight or a warehouse", () => {
    // A weight on a cash row would credit the season with grain that was
    // never delivered, and cash cannot be taken into a warehouse at all.
    expect(
      repaymentIssues({
        ...CASH,
        commodityId: "commodity-1",
        intakeWarehouseId: "warehouse-1",
        ratePerKgGhs: "4.20",
        weightKg: "900",
      }),
    ).toEqual([
      "commodityId",
      "weightKg",
      "ratePerKgGhs",
      "intakeWarehouseId",
    ]);
  });

  it("refuses a produce repayment that names an account", () => {
    // Produce moves no money: it turns a receivable into stock. Naming an
    // account would promise a ledger line that must never be posted.
    expect(
      repaymentIssues({
        ...PRODUCE,
        amountGhs: "1500",
        paymentAccountId: ACCOUNT,
      }),
    ).toEqual(["amountGhs", "paymentAccountId"]);
  });

  it("defaults to produce, the only repayment this book could once express", () => {
    const { kind, ...withoutKind } = PRODUCE;
    expect(kind).toBe("PRODUCE");
    expect(repaymentIssues(withoutKind)).toEqual([]);
  });
});
