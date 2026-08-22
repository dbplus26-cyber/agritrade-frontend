// test/unit/purchase-schema-money.test.ts
//
// The form must refuse a weight or price the backend would 400 on: prices are
// capped at 10,000/kg (moneyField(10_000)) and both weight and price are 2dp
// (multipleOf 0.01, rejected not rounded). Without both rules in the create
// form's shared validator, a 3dp price or a 50,000/kg price passes the form and
// meets a raw 400 the user cannot read.
import { describe, expect, it } from "vitest";

import { purchaseSchema } from "@/validations/purchase-schema";

const base = {
  agentProfileId: undefined,
  commodityId: "c1",
  notes: "",
  purchasedAt: "2026-08-01",
  source: "COMPANY" as const,
  supplierId: "s1",
  warehouseId: "w1",
};

describe("purchase form money validation", () => {
  it("accepts a 2dp price within the backend cap", () => {
    const r = purchaseSchema.safeParse({
      ...base,
      unitPriceGhs: "4.20",
      weightKg: "120.5",
    });
    expect(r.success).toBe(true);
  });

  it("rejects a price above the backend cap of 10,000/kg", () => {
    const r = purchaseSchema.safeParse({
      ...base,
      unitPriceGhs: "50000",
      weightKg: "10",
    });
    expect(r.success).toBe(false);
  });

  it("rejects a 3dp price and a 3dp weight", () => {
    expect(
      purchaseSchema.safeParse({ ...base, unitPriceGhs: "4.205", weightKg: "10" })
        .success,
    ).toBe(false);
    expect(
      purchaseSchema.safeParse({ ...base, unitPriceGhs: "4.20", weightKg: "10.005" })
        .success,
    ).toBe(false);
  });
});
