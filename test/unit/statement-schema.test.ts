// test/unit/statement-schema.test.ts
//
// The two registers that used to hold a money figure and move no money at
// all. Both now have to answer one question before they can be saved - which
// account did this come out of, and if none, why not - and a disposal has to
// say where its proceeds landed.
//
// Tested at the schema rather than through the dialogs on purpose: these are
// the rules, the dialogs only render them. The backend refuses the same
// mistakes (CASH_SOURCE_REQUIRED, CASH_SOURCE_AMBIGUOUS,
// DISPOSAL_ACCOUNT_REQUIRED), but a refusal that arrives after the save is a
// worse way to learn them.
import { describe, expect, it } from "vitest";

import {
  disposeAssetSchema,
  drawingSchema,
  fixedAssetSchema,
} from "@/validations/statement-schema";

const ACCOUNT = "0f6a4f1e-6a7a-4a1f-9f4e-1f2c3d4e5f60";

const DRAWING = {
  amountGhs: "5000",
  cashSource: "ACCOUNT" as const,
  notes: "School fees",
  occurredAt: "2026-03-04",
  paymentAccountId: ACCOUNT,
};

const ASSET = {
  acquiredAt: "2026-02-01",
  cashSource: "ACCOUNT" as const,
  classId: "vehicles",
  costGhs: "80000",
  name: "Sinotruk Howo tipper",
  notes: "",
  paymentAccountId: ACCOUNT,
};

/** The `path` of every issue a parse raised, for terse assertions. */
const issuePaths = (schema: { safeParse: (v: unknown) => unknown }) =>
  (input: unknown): string[] => {
    const result = schema.safeParse(input) as
      | { error: { issues: { path: PropertyKey[] }[] }; success: false }
      | { success: true };
    return result.success
      ? []
      : result.error.issues.map((i) => String(i.path[0]));
  };

const drawingIssues = issuePaths(drawingSchema);
const assetIssues = issuePaths(fixedAssetSchema);
const disposalIssues = issuePaths(disposeAssetSchema);

describe("drawingSchema", () => {
  it("accepts a drawing that names the account it came out of", () => {
    expect(drawingIssues(DRAWING)).toEqual([]);
  });

  it("refuses a drawing that names no account and no reason", () => {
    expect(
      drawingIssues({ ...DRAWING, paymentAccountId: "" }),
    ).toContain("paymentAccountId");
  });

  it("takes a reason instead, when no company money moved", () => {
    expect(
      drawingIssues({
        ...DRAWING,
        cashSource: "NONE",
        noCashReason: "Took a bag of maize from the store, not money",
        paymentAccountId: "",
      }),
    ).toEqual([]);
  });

  it("refuses an empty or throwaway reason", () => {
    const noCash = { ...DRAWING, cashSource: "NONE", paymentAccountId: "" };
    expect(drawingIssues({ ...noCash, noCashReason: "" })).toContain(
      "noCashReason",
    );
    expect(drawingIssues({ ...noCash, noCashReason: "x" })).toContain(
      "noCashReason",
    );
    expect(
      drawingIssues({ ...noCash, noCashReason: "y".repeat(301) }),
    ).toContain("noCashReason");
  });
});

describe("fixedAssetSchema", () => {
  it("accepts an asset that names the account that paid for it", () => {
    expect(assetIssues(ASSET)).toEqual([]);
  });

  it("refuses an asset that names neither an account nor a reason", () => {
    expect(assetIssues({ ...ASSET, paymentAccountId: "" })).toContain(
      "paymentAccountId",
    );
  });

  it("takes a reason instead, for an asset the business already owned", () => {
    expect(
      assetIssues({
        ...ASSET,
        cashSource: "NONE",
        noCashReason: "Owned before the books started",
        paymentAccountId: "",
      }),
    ).toEqual([]);
  });
});

describe("disposeAssetSchema", () => {
  it("requires the account the proceeds landed in", () => {
    expect(
      disposalIssues({
        disposalProceedsGhs: "12000",
        disposedAt: "2026-06-30",
      }),
    ).toContain("disposalAccountId");
  });

  it("accepts proceeds paid into a named account", () => {
    expect(
      disposalIssues({
        disposalAccountId: ACCOUNT,
        disposalProceedsGhs: "12000",
        disposedAt: "2026-06-30",
      }),
    ).toEqual([]);
  });

  it("asks for no account when the disposal brought in nothing", () => {
    // Scrapped or given away: nothing came in, so there is nowhere for it to
    // have landed. The backend refuses an account here (DISPOSAL_ACCOUNT_UNUSED).
    expect(
      disposalIssues({ disposalProceedsGhs: "0", disposedAt: "2026-06-30" }),
    ).toEqual([]);
  });
});
