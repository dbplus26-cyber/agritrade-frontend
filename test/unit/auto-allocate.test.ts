// test/unit/auto-allocate.test.ts
//
// The pure auto-allocate maths behind the shipment lot picker: which lots a
// strategy draws from, and the four things it must never break - a sale's
// needed weight, a lot's remaining weight, weight another sale on the same
// truck already claimed, and the truck's capacity.
import { describe, expect, it } from "vitest";

import {
  autoAllocate,
  type AllocationRows,
  type AutoAllocateLot,
  type AutoAllocateSale,
} from "@/components/admin/trading/auto-allocate";

const lot = (
  id: string,
  commodityId: string,
  remainingKg: number,
  unitCostGhs: number | null,
): AutoAllocateLot => ({
  commodity: { id: commodityId, name: commodityId },
  id,
  remainingKg,
  unitCostGhs,
});

const sale = (
  id: string,
  lines: { agreedKg: number; commodityId: string }[],
): AutoAllocateSale => ({
  id,
  lines: lines.map((l) => ({
    agreedKg: l.agreedKg,
    allocatedKg: 0,
    commodityId: l.commodityId,
    commodityName: l.commodityId,
    outstandingKg: l.agreedKg,
  })),
});

const run = (
  lots: AutoAllocateLot[],
  sales: AutoAllocateSale[],
  opts?: {
    capacityKg?: number | null;
    current?: AllocationRows;
    fill?: string[];
    strategy?: "CHEAPEST" | "COSTLIEST";
  },
) =>
  autoAllocate({
    capacityKg: opts?.capacityKg ?? null,
    current: opts?.current ?? {},
    fill: opts?.fill ?? sales.map((s) => s.id),
    lots,
    sales,
    strategy: opts?.strategy ?? "CHEAPEST",
  });

describe("autoAllocate - strategy", () => {
  it("fills exactly from the cheapest lot when one covers the sale", () => {
    const res = run(
      [lot("dear", "maize", 1000, 5), lot("cheap", "maize", 1000, 3)],
      [sale("s1", [{ agreedKg: 800, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({ cheap: "800" });
    expect(res.filledKg).toBe(800);
    expect(res.shortfalls).toEqual([]);
  });

  it("fills from the costliest lot under the COSTLIEST strategy", () => {
    const res = run(
      [lot("dear", "maize", 1000, 5), lot("cheap", "maize", 1000, 3)],
      [sale("s1", [{ agreedKg: 800, commodityId: "maize" }])],
      { strategy: "COSTLIEST" },
    );
    expect(res.rows.s1).toEqual({ dear: "800" });
  });

  it("walks lots in cost order when one is not enough", () => {
    const res = run(
      [
        lot("mid", "maize", 300, 4),
        lot("dear", "maize", 300, 5),
        lot("cheap", "maize", 300, 3),
      ],
      [sale("s1", [{ agreedKg: 700, commodityId: "maize" }])],
    );
    // 300 cheap + 300 mid + 100 dear.
    expect(res.rows.s1).toEqual({ cheap: "300", dear: "100", mid: "300" });
    expect(res.filledKg).toBe(700);
  });

  it("breaks equal costs on the incoming order, which is FIFO", () => {
    // Same cost everywhere: the fill must be the oldest-first draw the
    // dispatch-time FIFO fallback would have made.
    const res = run(
      [
        lot("oldest", "maize", 200, 4),
        lot("middle", "maize", 200, 4),
        lot("newest", "maize", 200, 4),
      ],
      [sale("s1", [{ agreedKg: 300, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({ middle: "100", oldest: "200" });
  });

  it("sorts cost-redacted lots last under both strategies", () => {
    const lots = [lot("hidden", "maize", 500, null), lot("known", "maize", 500, 9)];
    const sales = [sale("s1", [{ agreedKg: 500, commodityId: "maize" }])];
    expect(run(lots, sales, { strategy: "CHEAPEST" }).rows.s1).toEqual({
      known: "500",
    });
    expect(run(lots, sales, { strategy: "COSTLIEST" }).rows.s1).toEqual({
      known: "500",
    });
  });

  it("keeps cost-redacted lots in FIFO order among themselves", () => {
    const res = run(
      [lot("first", "maize", 100, null), lot("second", "maize", 100, null)],
      [sale("s1", [{ agreedKg: 150, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({ first: "100", second: "50" });
  });
});

describe("autoAllocate - limits", () => {
  it("reports a stock shortfall instead of over-drawing the warehouse", () => {
    const res = run(
      [lot("only", "maize", 400, 3)],
      [sale("s1", [{ agreedKg: 1000, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({ only: "400" });
    expect(res.shortfalls).toEqual([
      { commodityId: "maize", reason: "STOCK", saleId: "s1", shortKg: 600 },
    ]);
  });

  it("never draws a lot past its remaining weight across commodities", () => {
    const res = run(
      [lot("maizeLot", "maize", 100, 3), lot("soyaLot", "soya", 100, 3)],
      [
        sale("s1", [
          { agreedKg: 500, commodityId: "maize" },
          { agreedKg: 50, commodityId: "soya" },
        ]),
      ],
    );
    expect(res.rows.s1).toEqual({ maizeLot: "100", soyaLot: "50" });
    expect(res.shortfalls).toEqual([
      { commodityId: "maize", reason: "STOCK", saleId: "s1", shortKg: 400 },
    ]);
  });

  it("stops at the truck capacity and says the truck is full", () => {
    const res = run(
      [lot("big", "maize", 5000, 3)],
      [sale("s1", [{ agreedKg: 4000, commodityId: "maize" }])],
      { capacityKg: 2500 },
    );
    expect(res.rows.s1).toEqual({ big: "2500" });
    expect(res.shortfalls).toEqual([
      { commodityId: "maize", reason: "CAPACITY", saleId: "s1", shortKg: 1500 },
    ]);
  });

  it("counts the weight of sales it is NOT refilling against the capacity", () => {
    const res = run(
      [lot("a", "maize", 5000, 3), lot("b", "maize", 5000, 4)],
      [
        sale("s1", [{ agreedKg: 1000, commodityId: "maize" }]),
        sale("s2", [{ agreedKg: 3000, commodityId: "maize" }]),
      ],
      { capacityKg: 3000, current: { s1: { a: "1000" } }, fill: ["s2"] },
    );
    // s1's 1000 kg is already on the truck, so only 2000 kg is left to give.
    expect(res.rows.s1).toEqual({ a: "1000" });
    expect(res.filledKg).toBe(2000);
    expect(res.shortfalls[0]?.reason).toBe("CAPACITY");
  });

  it("ignores capacity when the truck has none stated", () => {
    const res = run(
      [lot("big", "maize", 9000, 3)],
      [sale("s1", [{ agreedKg: 8000, commodityId: "maize" }])],
      { capacityKg: null },
    );
    expect(res.rows.s1).toEqual({ big: "8000" });
    expect(res.shortfalls).toEqual([]);
  });
});

describe("autoAllocate - competing sales on one truck", () => {
  it("splits one lot between two sales without over-drawing it", () => {
    const res = run(
      [lot("shared", "maize", 1000, 3), lot("spare", "maize", 1000, 6)],
      [
        sale("s1", [{ agreedKg: 700, commodityId: "maize" }]),
        sale("s2", [{ agreedKg: 700, commodityId: "maize" }]),
      ],
    );
    // The first-listed sale gets first pick of the cheap lot; the second takes
    // what is left of it and tops up from the dearer one.
    expect(res.rows.s1).toEqual({ shared: "700" });
    expect(res.rows.s2).toEqual({ shared: "300", spare: "400" });
    expect(res.shortfalls).toEqual([]);
  });

  it("respects weight another sale has already keyed against the same lot", () => {
    const res = run(
      [lot("shared", "maize", 1000, 3), lot("spare", "maize", 1000, 6)],
      [
        sale("s1", [{ agreedKg: 900, commodityId: "maize" }]),
        sale("s2", [{ agreedKg: 400, commodityId: "maize" }]),
      ],
      { current: { s1: { shared: "900" } }, fill: ["s2"] },
    );
    expect(res.rows.s1).toEqual({ shared: "900" });
    expect(res.rows.s2).toEqual({ shared: "100", spare: "300" });
  });

  it("treats an unusable weight input on another sale as zero", () => {
    const res = run(
      [lot("shared", "maize", 500, 3)],
      [
        sale("s1", [{ agreedKg: 500, commodityId: "maize" }]),
        sale("s2", [{ agreedKg: 500, commodityId: "maize" }]),
      ],
      { current: { s1: { shared: "abc" } }, fill: ["s2"] },
    );
    expect(res.rows.s2).toEqual({ shared: "500" });
  });
});

describe("autoAllocate - replacing and preserving", () => {
  it("replaces the refilled sale's weights rather than topping them up", () => {
    const res = run(
      [lot("cheap", "maize", 1000, 3), lot("dear", "maize", 1000, 9)],
      [sale("s1", [{ agreedKg: 500, commodityId: "maize" }])],
      { current: { s1: { dear: "500" } }, fill: ["s1"] },
    );
    // Switching strategy must undo the previous fill, not add to it.
    expect(res.rows.s1).toEqual({ cheap: "500" });
  });

  it("leaves sales outside the fill list exactly as they were", () => {
    const res = run(
      [lot("cheap", "maize", 5000, 3)],
      [
        sale("s1", [{ agreedKg: 100, commodityId: "maize" }]),
        sale("s2", [{ agreedKg: 100, commodityId: "maize" }]),
      ],
      { current: { s1: { cheap: "42" } }, fill: ["s2"] },
    );
    expect(res.rows.s1).toEqual({ cheap: "42" });
    expect(res.rows.s2).toEqual({ cheap: "100" });
  });

  it("adds up two lines of the same commodity on one sale", () => {
    const res = run(
      [lot("only", "maize", 1000, 3)],
      [
        sale("s1", [
          { agreedKg: 200, commodityId: "maize" },
          { agreedKg: 300, commodityId: "maize" },
        ]),
      ],
    );
    expect(res.rows.s1).toEqual({ only: "500" });
  });

  it("keeps decimal weights clean", () => {
    const res = run(
      [lot("a", "maize", 0.1, 3), lot("b", "maize", 0.2, 4)],
      [sale("s1", [{ agreedKg: 0.3, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({ a: "0.1", b: "0.2" });
    expect(res.filledKg).toBe(0.3);
  });

  it("returns empty weights for a sale with nothing to load", () => {
    const res = run(
      [lot("a", "maize", 100, 3)],
      [sale("s1", [{ agreedKg: 0, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({});
    expect(res.shortfalls).toEqual([]);
  });

  it("has nothing to give when the warehouse holds no matching lot", () => {
    const res = run(
      [lot("a", "soya", 100, 3)],
      [sale("s1", [{ agreedKg: 100, commodityId: "maize" }])],
    );
    expect(res.rows.s1).toEqual({});
    expect(res.shortfalls).toEqual([
      { commodityId: "maize", reason: "STOCK", saleId: "s1", shortKg: 100 },
    ]);
  });
});
