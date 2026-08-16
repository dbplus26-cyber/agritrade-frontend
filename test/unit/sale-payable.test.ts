// test/unit/sale-payable.test.ts
//
// The frontend half of the backend's `salePayableTotal`. A sale carries two
// totals now - what both sides shook hands on, and what the buyer will pay
// once the load was re-weighed on arrival - and five screens derive "what is
// still owed" from them. They agreed while there was one column to read; the
// moment there are two, agreeing becomes something somebody has to remember.
//
// So the rules live here, and every screen calls them:
//
//   * null settled is NOT zero - it means nobody has weighed the load yet, and
//     the agreed figure still stands;
//   * a settled ZERO is a real answer - a delivery refused outright is settled
//     at nothing - and must never fall back to the agreed figure;
//   * redacted money (null, financial visibility) stays null rather than
//     becoming a figure somebody could act on;
//   * "paid in full" is decided on the payable figure and at 2dp, so a
//     binary rounding error cannot leave a settled sale looking unpaid.
import { describe, expect, it } from "vitest";

import {
  saleBalanceGhs,
  saleIsPaidInFull,
  salePayableTotal,
  saleSettlementDeltaGhs,
} from "@/components/admin/trading/sale-payable";

describe("salePayableTotal", () => {
  it("stands on the agreed figure while nothing has been weighed", () => {
    expect(
      salePayableTotal({ agreedTotalGhs: 12_000, settledTotalGhs: null }),
    ).toBe(12_000);
  });

  it("takes the settled figure once the load has been weighed", () => {
    expect(
      salePayableTotal({ agreedTotalGhs: 12_000, settledTotalGhs: 11_760 }),
    ).toBe(11_760);
  });

  it("treats a settled zero as an answer, not as a missing figure", () => {
    // A load refused on sight is settled at nothing. `||` here would chase the
    // buyer for a delivery they sent back.
    expect(
      salePayableTotal({ agreedTotalGhs: 12_000, settledTotalGhs: 0 }),
    ).toBe(0);
  });

  it("stays hidden when the money was redacted", () => {
    expect(
      salePayableTotal({ agreedTotalGhs: null, settledTotalGhs: null }),
    ).toBeNull();
  });

  it("falls back to agreed when the field is absent altogether", () => {
    // An older API build that does not send the column yet must not read as
    // "settled at nothing".
    expect(salePayableTotal({ agreedTotalGhs: 12_000 })).toBe(12_000);
  });
});

describe("saleSettlementDeltaGhs", () => {
  it("is null while there is no settled figure to compare", () => {
    expect(
      saleSettlementDeltaGhs({ agreedTotalGhs: 12_000, settledTotalGhs: null }),
    ).toBeNull();
  });

  it("is negative when the buyer settled below the agreement", () => {
    expect(
      saleSettlementDeltaGhs({
        agreedTotalGhs: 12_000,
        settledTotalGhs: 11_760,
      }),
    ).toBe(-240);
  });

  it("is positive when more arrived than left", () => {
    expect(
      saleSettlementDeltaGhs({
        agreedTotalGhs: 12_000,
        settledTotalGhs: 12_100,
      }),
    ).toBe(100);
  });
});

describe("saleBalanceGhs", () => {
  it("measures what is left against the settled figure, not the agreed one", () => {
    expect(
      saleBalanceGhs({
        agreedTotalGhs: 12_000,
        paidGhs: 11_760,
        settledTotalGhs: 11_760,
      }),
    ).toBe(0);
  });

  it("measures against the agreed figure while nothing is settled", () => {
    expect(
      saleBalanceGhs({
        agreedTotalGhs: 12_000,
        paidGhs: 5_000,
        settledTotalGhs: null,
      }),
    ).toBe(7_000);
  });

  it("never reads as a credit when more was paid than is now owed", () => {
    // Settling below what was already paid is refused by the API, but a
    // negative balance on screen would still be a lie about who owes whom.
    expect(
      saleBalanceGhs({
        agreedTotalGhs: 12_000,
        paidGhs: 12_000,
        settledTotalGhs: 11_760,
      }),
    ).toBe(0);
  });

  it("rounds to pesewas so a binary remainder is not an outstanding debt", () => {
    expect(
      saleBalanceGhs({
        agreedTotalGhs: 0.3,
        paidGhs: 0.1 + 0.2,
        settledTotalGhs: null,
      }),
    ).toBe(0);
  });

  it("stays hidden when either side of the sum was redacted", () => {
    expect(
      saleBalanceGhs({
        agreedTotalGhs: null,
        paidGhs: null,
        settledTotalGhs: null,
      }),
    ).toBeNull();
    expect(
      saleBalanceGhs({
        agreedTotalGhs: 12_000,
        paidGhs: null,
        settledTotalGhs: null,
      }),
    ).toBeNull();
  });
});

describe("saleIsPaidInFull", () => {
  it("is true once payments cover the settled figure", () => {
    expect(
      saleIsPaidInFull({
        agreedTotalGhs: 12_000,
        paidGhs: 11_760,
        settledTotalGhs: 11_760,
      }),
    ).toBe(true);
  });

  it("is false while the agreed figure still stands unpaid", () => {
    expect(
      saleIsPaidInFull({
        agreedTotalGhs: 12_000,
        paidGhs: 11_760,
        settledTotalGhs: null,
      }),
    ).toBe(false);
  });

  it("is false, not true, when the figures are hidden", () => {
    // A redacted balance is unknown. Reading it as settled would tell a user
    // without financial visibility that nothing is owed.
    expect(
      saleIsPaidInFull({
        agreedTotalGhs: null,
        paidGhs: null,
        settledTotalGhs: null,
      }),
    ).toBe(false);
  });
});
