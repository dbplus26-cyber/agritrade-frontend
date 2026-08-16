// test/unit/arrive-shipment-schema.test.ts
//
// The arrival form's rules, mirroring the backend's `arriveShipmentSchema`.
// Weights and amounts are typed into text inputs and converted at submit, so
// this is where "980", "" and "-5" are told apart before the wire sees them.
//
// The two that matter and are easy to get backwards:
//   * ZERO is legitimate on both fields - a load that never turned up weighs
//     nothing, and a delivery refused outright is settled at nothing;
//   * BELOW zero is refused - no scale reads a negative weight, and a
//     negative settlement is a refund, which the payment ledger owns.
import { describe, expect, it } from "vitest";

import { arriveShipmentSchema } from "@/validations/shipment-schema";

const line = (receivedKg: string) => ({ commodityId: "c-1", receivedKg });

const sale = (settledTotalGhs: string, receivedKg = "980") => ({
  lines: [line(receivedKg)],
  saleId: "sale-1",
  settledTotalGhs,
});

/** The first message on a field path, or undefined when it passed. */
const errorFor = (
  values: unknown,
  path: (number | string)[],
): string | undefined => {
  const result = arriveShipmentSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find(
    (i) => i.path.join(".") === path.join("."),
  )?.message;
};

describe("arriveShipmentSchema", () => {
  it("accepts a weighed load", () => {
    expect(
      arriveShipmentSchema.safeParse({ sales: [sale("11760")] }).success,
    ).toBe(true);
  });

  it("accepts a load that never turned up: zero received, nothing to pay", () => {
    expect(arriveShipmentSchema.safeParse({ sales: [sale("0", "0")] }).success)
      .toBe(true);
  });

  it("refuses a negative received weight", () => {
    expect(errorFor({ sales: [sale("11760", "-5")] }, ["sales", 0, "lines", 0, "receivedKg"]))
      .toMatch(/cannot be negative/i);
  });

  it("refuses a negative settlement", () => {
    expect(errorFor({ sales: [sale("-1")] }, ["sales", 0, "settledTotalGhs"]))
      .toMatch(/cannot be negative/i);
  });

  it("asks for the weight rather than reading a blank as nothing received", () => {
    // A blank is "not answered yet". Coercing it to 0 would silently write off
    // the whole load and settle the sale at whatever else was typed.
    expect(errorFor({ sales: [sale("11760", "")] }, ["sales", 0, "lines", 0, "receivedKg"]))
      .toMatch(/enter/i);
  });

  it("asks for the payment rather than reading a blank as nothing owed", () => {
    expect(errorFor({ sales: [sale("")] }, ["sales", 0, "settledTotalGhs"]))
      .toMatch(/enter/i);
  });

  it("refuses text where a figure belongs", () => {
    expect(errorFor({ sales: [sale("about 12k")] }, ["sales", 0, "settledTotalGhs"]))
      .toBeDefined();
    expect(errorFor({ sales: [sale("11760", "a lot")] }, ["sales", 0, "lines", 0, "receivedKg"]))
      .toBeDefined();
  });

  it("holds amounts to pesewas, which is all the API stores", () => {
    expect(errorFor({ sales: [sale("11760.555")] }, ["sales", 0, "settledTotalGhs"]))
      .toMatch(/pesewas|2 decimal/i);
  });

  it("takes a trip marked arrived before anybody weighed it", () => {
    // The backend allows arrival with no figures at all - the load is on the
    // ground either way, and refusing would leave the register saying the
    // truck is still on the road.
    expect(arriveShipmentSchema.safeParse({ sales: [] }).success).toBe(true);
    expect(arriveShipmentSchema.safeParse({}).success).toBe(true);
  });
});
