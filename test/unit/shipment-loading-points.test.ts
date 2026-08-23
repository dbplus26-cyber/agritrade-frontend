// test/unit/shipment-loading-points.test.ts
//
// Where a truck loads, now that it is two different kinds of place.
//
// Most of what the business buys at the farm gate goes straight to the buyer
// and never enters a shed, so a trip can start at a warehouse, at a supplier's
// yard, or at both - and the planning form must refuse one that starts
// nowhere, because a truck with no loading point can be given goods from
// nowhere and only finds out at dispatch.
import { describe, expect, it } from "vitest";

import {
  loadingFrom,
  loadingPointsOf,
} from "@/components/admin/trading/shipment-bits";
import { shipmentSchema } from "@/validations/shipment-schema";

const shed = (name: string) => ({ id: `w-${name}`, name });
const seller = (name: string) => ({ id: `s-${name}`, name });

/** The three fields the helper reads, and nothing else. */
const trip = (over: {
  loadingWarehouses?: { id: string; name: string }[];
  originWarehouse?: { id: string; name: string } | null;
  pickupSuppliers?: { id: string; name: string }[];
}) => ({
  loadingWarehouses: over.loadingWarehouses ?? [],
  originWarehouse: over.originWarehouse ?? null,
  pickupSuppliers: over.pickupSuppliers ?? [],
});

/** A complete plan, so each case below varies only its loading points. */
const plan = (over: Record<string, unknown>) => ({
  destination: "Accra",
  driverName: "Kwame",
  driverPhone: "0244000000",
  saleIds: ["sale-1"],
  truckReg: "GT-1234-24",
  ...over,
});

const loadingPointError = (values: Record<string, unknown>) => {
  const result = shipmentSchema.safeParse(values);
  if (result.success) return undefined;
  return result.error.issues.find(
    (i) => i.path.join(".") === "originWarehouseId",
  )?.message;
};

describe("loadingPointsOf", () => {
  it("lists the sheds a truck calls at", () => {
    expect(
      loadingPointsOf(
        trip({ loadingWarehouses: [shed("Tamale"), shed("Savelugu")] }),
      ),
    ).toEqual(["Tamale", "Savelugu"]);
  });

  it("falls back to the origin on a trip planned before multi-shed loading", () => {
    expect(loadingPointsOf(trip({ originWarehouse: shed("Tamale") }))).toEqual([
      "Tamale",
    ]);
  });

  it("names the sellers on a trip that only collects at the farm gate", () => {
    const points = loadingPointsOf(
      trip({ pickupSuppliers: [seller("Alhassan"), seller("Fuseini")] }),
    );
    expect(points).toEqual(["Alhassan", "Fuseini"]);
    expect(loadingFrom(trip({ pickupSuppliers: [seller("Alhassan")] }))).toBe(
      "Alhassan",
    );
  });

  it("puts the sheds before the farm gates on a mixed load", () => {
    expect(
      loadingFrom(
        trip({
          loadingWarehouses: [shed("Tamale")],
          pickupSuppliers: [seller("Alhassan")],
        }),
      ),
    ).toBe("Tamale and Alhassan");
  });

  it("says so rather than reading blank when nothing is chosen yet", () => {
    expect(loadingPointsOf(trip({}))).toEqual([]);
    expect(loadingFrom(trip({}))).toBe("no loading point yet");
  });
});

describe("the planning form's loading points", () => {
  it("accepts a warehouse alone", () => {
    expect(loadingPointError(plan({ originWarehouseId: "w-1" }))).toBeUndefined();
  });

  it("accepts a supplier collection alone - no shed is involved", () => {
    expect(
      loadingPointError(plan({ pickupSupplierIds: ["s-1"] })),
    ).toBeUndefined();
  });

  it("accepts both on one truck", () => {
    expect(
      loadingPointError(
        plan({ originWarehouseId: "w-1", pickupSupplierIds: ["s-1"] }),
      ),
    ).toBeUndefined();
  });

  it("refuses a trip that loads nowhere", () => {
    expect(loadingPointError(plan({}))).toBe(
      "Say where this truck loads - a warehouse, a supplier to collect from, or both",
    );
  });
});
