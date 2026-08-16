// test/unit/purchase-cost-total.test.ts
//
// "What have these goods cost us" is the figure the owner asked for, and it is
// arithmetic the console does rather than reads, because the API redacts money
// per user and a sum has to inherit that. Four rules, all of them a way of
// being wrong about real money:
//
//   * a voided voucher is not a cost. It keeps its number and its reason, and
//     it stops counting;
//   * only the costs taken INTO the goods reach the headline. The rest are
//     attributable to the purchase and are costs of their own month, and
//     adding them here would double-count them against the month's books;
//   * one redacted amount makes the whole sum redacted. A total that quietly
//     skipped the figures a reader may not see would be a smaller, wrong
//     number wearing the same label;
//   * cedis are summed to the pesewa. 0.1 + 0.2 in binary floating point is
//     not 0.3, and a receipt that reads GH₵ 0.30000000000000004 is the kind
//     of thing that gets a system distrusted.
import { describe, expect, it } from "vitest";

import { summarisePurchaseCosts } from "@/components/admin/purchases/purchase-bits";
import type { IPurchaseCost } from "@/types/purchase.types";

const cost = (over: Partial<IPurchaseCost>): IPurchaseCost =>
  ({
    amountGhs: 100,
    capitalisedAt: "2026-07-11T00:00:00.000Z",
    category: { id: "cat-haulage", name: "Haulage" },
    createdAt: "2026-07-11T00:00:00.000Z",
    description: null,
    id: "exp-1",
    incurredAt: "2026-07-11T00:00:00.000Z",
    shipment: null,
    transactionNo: "EXP-2026-00156",
    voidedAt: null,
    voidReason: null,
    ...over,
  }) as IPurchaseCost;

describe("summarisePurchaseCosts", () => {
  it("is just the grain when nothing has been recorded against it", () => {
    const s = summarisePurchaseCosts([], 3000);
    expect(s.goodsCostGhs).toBe(3000);
    expect(s.capitalisedGhs).toBe(0);
    expect(s.monthlyGhs).toBe(0);
  });

  it("adds the costs taken into the goods to the grain", () => {
    const s = summarisePurchaseCosts(
      [cost({ amountGhs: 400 }), cost({ amountGhs: 150, id: "exp-2" })],
      3000,
    );
    expect(s.capitalisedGhs).toBe(550);
    expect(s.goodsCostGhs).toBe(3550);
  });

  it("keeps a cost of the month out of what the goods cost", () => {
    const s = summarisePurchaseCosts(
      [cost({ amountGhs: 120, capitalisedAt: null })],
      3000,
    );
    expect(s.monthlyGhs).toBe(120);
    expect(s.capitalisedGhs).toBe(0);
    expect(s.goodsCostGhs).toBe(3000);
  });

  it("stops counting a voided voucher, and stops listing it as live", () => {
    const s = summarisePurchaseCosts(
      [
        cost({ amountGhs: 400 }),
        cost({
          amountGhs: 500,
          id: "exp-2",
          voidedAt: "2026-07-20T00:00:00.000Z",
        }),
      ],
      3000,
    );
    expect(s.capitalisedGhs).toBe(400);
    expect(s.goodsCostGhs).toBe(3400);
    expect(s.live.map((c) => c.id)).toEqual(["exp-1"]);
  });

  it("redacts the whole sum when one figure was redacted", () => {
    const s = summarisePurchaseCosts(
      [cost({ amountGhs: 400 }), cost({ amountGhs: null, id: "exp-2" })],
      3000,
    );
    expect(s.capitalisedGhs).toBeNull();
    expect(s.goodsCostGhs).toBeNull();
  });

  it("redacts what the goods cost when the purchase price itself is hidden", () => {
    const s = summarisePurchaseCosts([cost({ amountGhs: 400 })], null);
    expect(s.capitalisedGhs).toBe(400);
    expect(s.goodsCostGhs).toBeNull();
  });

  it("sums to the pesewa rather than to binary floating point", () => {
    const s = summarisePurchaseCosts(
      [cost({ amountGhs: 0.1 }), cost({ amountGhs: 0.2, id: "exp-2" })],
      0.3,
    );
    expect(s.capitalisedGhs).toBe(0.3);
    expect(s.goodsCostGhs).toBe(0.6);
  });
});
