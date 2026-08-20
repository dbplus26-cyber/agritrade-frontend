// test/unit/cedis-product.test.ts
//
// The weight x price money product an agent's "buy and pay now" sends as the
// payment amount. The backend rounds the purchase total with
// Decimal.toDecimalPlaces(2) and rejects any payment amount that is not a whole
// number of pesewas (moneyField's multipleOf(0.01)). The naive JS product
// carries float noise (6 x 4.20 = 25.200000000000003), which is not a multiple
// of 0.01, so the field flow 400d for a large share of ordinary inputs.
//
// These pin that cedisProduct reproduces the server's total to the pesewa, so
// the payment neither trips the 2dp check nor over/under-pays the purchase.
import { describe, expect, it } from "vitest";

import { cedisProduct } from "@/lib/format-money";

const isWholePesewa = (n: number) => Math.round(n * 100) === n * 100;

describe("cedisProduct", () => {
  it("returns a whole number of pesewas for products the naive float botches", () => {
    for (const [w, p] of [
      [6, 4.2],
      [3, 2.15],
      [12, 4.2],
      [120.1, 5.03],
      [62.5, 4.85],
      [33.33, 4.55],
    ] as const) {
      const amount = cedisProduct(w, p);
      expect(isWholePesewa(amount)).toBe(true);
    }
  });

  it("matches the mathematically exact 2dp product (half-up)", () => {
    expect(cedisProduct(120.1, 5.03)).toBe(604.1); // 604.103 -> 604.10
    expect(cedisProduct(1, 2.15)).toBe(2.15);
    expect(cedisProduct(10, 4.2)).toBe(42);
    // Exact half-cent boundary rounds up, like Decimal's default.
    expect(cedisProduct(1.5, 0.07)).toBe(0.11); // 0.105 -> 0.11
  });

  it("never yields more than two decimal places", () => {
    for (let w = 1; w <= 40; w += 0.37) {
      for (const p of [4.2, 5.03, 3.15, 2.99]) {
        const s = String(cedisProduct(w, p));
        const decimals = s.includes(".") ? s.split(".")[1].length : 0;
        expect(decimals).toBeLessThanOrEqual(2);
      }
    }
  });
});
