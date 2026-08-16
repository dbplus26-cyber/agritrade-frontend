// test/component/ShipmentArrival.test.tsx
//
// The dialog that decides what a buyer is actually billed. Grain is weighed at
// the origin and again on arrival, and the two figures differ; the console used
// to know only the first, so it billed a number nobody was going to pay.
//
// What is pinned here is what neither the schema nor the server can say:
//
//   * the form is built from what was LOADED (the allocations), because a
//     commodity with no allocation is refused with COMMODITY_NOT_LOADED;
//   * the payment to expect is SUGGESTED from received x agreed price and then
//     left alone once somebody types over it - the two sides settle on a round
//     figure after arguing about a wet load, so a computed-and-locked field
//     would be wrong on exactly the trips that matter;
//   * weights and amounts cross the wire as NUMBERS, from text inputs;
//   * a trip can be marked arrived with no figures at all;
//   * settling below what the buyer has already paid is refused HERE, naming
//     the sale - the server's 409 does not name it, and a trip carries several.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { ArrivalDialog } from "@/components/admin/trading/shipment-arrival-dialog";
import type { IShipment } from "@/types/admin-shipment.types";

const { arriveTrigger, saleQuery } = vi.hoisted(() => ({
  arriveTrigger: vi.fn(),
  saleQuery: vi.fn(),
}));

vi.mock("@/redux/shipments/shipments-api", () => ({
  useArriveShipmentMutation: () => [arriveTrigger, { isLoading: false }],
}));

vi.mock("@/redux/sales/admin-sales-api", () => ({
  useGetSaleQuery: (id: string) => saleQuery(id),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

const userEvent = userEventBase.setup({ delay: null });

/** Maize at 10/kg and soya at 4/kg: 1,000 + 500 loaded, GHS 12,000 agreed. */
const SALE_DETAIL = {
  data: {
    data: {
      sale: {
        lines: [
          { commodity: { id: "maize", name: "Maize" }, id: "l1", unitPriceGhs: 10 },
          { commodity: { id: "soya", name: "Soya beans" }, id: "l2", unitPriceGhs: 4 },
        ],
      },
    },
  },
  isLoading: false,
};

const allocation = (
  id: string,
  commodityId: string,
  commodityName: string,
  weightKg: number,
) => ({
  commodity: { id: commodityId, name: commodityName },
  id,
  lineCostGhs: null,
  lotId: `lot-${id}`,
  sale: { id: "sale-1", transactionNo: "SAL-2026-00011" },
  unitCostSnapshotGhs: null,
  weightKg,
});

const shipment = (paidGhs: null | number = 0): IShipment =>
  ({
    allocations: [
      allocation("a1", "maize", "Maize", 600),
      // A second lot of the same crop: what was LOADED is the sum, not a row.
      allocation("a2", "maize", "Maize", 400),
      allocation("a3", "soya", "Soya beans", 500),
    ],
    id: "shp-1",
    sales: [
      {
        agreedTotalGhs: 12_000,
        balanceGhs: 12_000 - (paidGhs ?? 0),
        buyer: { id: "buyer-1", name: "Kofi Trading", phone: null },
        id: "sale-1",
        lines: [],
        paidGhs,
        settledTotalGhs: null,
        status: "CONFIRMED",
        transactionNo: "SAL-2026-00011",
      },
    ],
    transactionNo: "SHP-2026-00042",
  }) as unknown as IShipment;

const maizeBox = () => screen.getByLabelText(/Received Maize/i);
const soyaBox = () => screen.getByLabelText(/Received Soya beans/i);
const paymentBox = () => screen.getByLabelText(/Payment to expect/i);

beforeEach(() => {
  arriveTrigger.mockReset();
  arriveTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  saleQuery.mockReturnValue(SALE_DETAIL);
});

describe("ArrivalDialog", () => {
  it("shows what was loaded, summing the lots of one crop", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);

    expect(await screen.findByText("loaded 1,000 kg")).toBeInTheDocument();
    expect(screen.getByText("loaded 500 kg")).toBeInTheDocument();
    // Pre-filled with the loaded weight: on a good trip nothing was lost, and
    // an admin confirms rather than copies figures off a waybill.
    expect(maizeBox()).toHaveValue("1000");
    expect(soyaBox()).toHaveValue("500");
  });

  it("suggests received x agreed price, and follows the weights", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);

    expect(await screen.findByDisplayValue("12000.00")).toBeInTheDocument();

    await userEvent.clear(maizeBox());
    await userEvent.type(maizeBox(), "976");

    // 976 x 10 + 500 x 4
    expect(paymentBox()).toHaveValue("11760.00");
    expect(screen.getByText("GH₵ 11,760.00")).toBeInTheDocument();
  });

  it("keeps a figure the admin typed over, and can offer the suggestion back", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);
    await screen.findByDisplayValue("12000.00");

    await userEvent.clear(paymentBox());
    await userEvent.type(paymentBox(), "11500");

    // The whole point: the two sides settled on a round figure, and a later
    // correction to a weight must not silently undo it.
    await userEvent.clear(maizeBox());
    await userEvent.type(maizeBox(), "976");
    expect(paymentBox()).toHaveValue("11500");

    await userEvent.click(screen.getByRole("button", { name: "Use" }));
    expect(paymentBox()).toHaveValue("11760.00");
  });

  it("sends weights and amounts as numbers, per sale and per commodity", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);
    await screen.findByDisplayValue("12000.00");

    await userEvent.clear(maizeBox());
    await userEvent.type(maizeBox(), "976");
    await userEvent.click(screen.getByRole("button", { name: "Record arrival" }));

    expect(arriveTrigger).toHaveBeenCalledTimes(1);
    expect(arriveTrigger).toHaveBeenCalledWith({
      id: "shp-1",
      sales: [
        {
          lines: [
            { commodityId: "maize", receivedKg: 976 },
            { commodityId: "soya", receivedKg: 500 },
          ],
          saleId: "sale-1",
          settledTotalGhs: 11760,
        },
      ],
    });
  });

  it("takes a load that never turned up: nothing received, nothing to pay", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);
    await screen.findByDisplayValue("12000.00");

    await userEvent.clear(maizeBox());
    await userEvent.type(maizeBox(), "0");
    await userEvent.clear(soyaBox());
    await userEvent.type(soyaBox(), "0");
    await userEvent.click(screen.getByRole("button", { name: "Record arrival" }));

    const [[sent]] = arriveTrigger.mock.calls as [
      [{ sales: { lines: { receivedKg: number }[]; settledTotalGhs: number }[] }],
    ];
    expect(sent.sales[0].settledTotalGhs).toBe(0);
    expect(sent.sales[0].lines.map((l) => l.receivedKg)).toEqual([0, 0]);
  });

  it("marks the trip arrived with no figures at all", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);

    await userEvent.click(screen.getByRole("button", { name: "Weigh it later" }));

    // No `sales` key: the load is on the ground either way, and the figures
    // are recorded once somebody has weighed it.
    expect(arriveTrigger).toHaveBeenCalledWith({ id: "shp-1" });
  });

  it("refuses to settle below what the buyer already paid, and names the sale", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment(11_900)} />);
    await screen.findByDisplayValue("12000.00");

    await userEvent.clear(paymentBox());
    await userEvent.type(paymentBox(), "11000");
    await userEvent.click(screen.getByRole("button", { name: "Record arrival" }));

    expect(
      await screen.findByText(/Reverse a payment on SAL-2026-00011 first/i),
    ).toBeInTheDocument();
    expect(arriveTrigger).not.toHaveBeenCalled();
  });

  it("keeps the figures on screen and shows the server's words when refused", async () => {
    arriveTrigger.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: {
            code: "SETTLED_BELOW_PAID",
            message:
              "That is less than this buyer has already paid. Reverse a payment first, then record the arrival.",
          },
          status: 409,
        }),
    });

    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);
    await screen.findByDisplayValue("12000.00");
    await userEvent.click(screen.getByRole("button", { name: "Record arrival" }));

    expect(
      await screen.findByText(/Reverse a payment first, then record the arrival/i),
    ).toBeInTheDocument();
    // Still on screen to be corrected, not lost behind a closed dialog.
    expect(paymentBox()).toBeInTheDocument();
  });

  it("suggests nothing it cannot show the workings for", async () => {
    // Money redacted (no financial visibility): a suggestion nobody can check
    // is worse than none, so the box is left for the admin to fill.
    saleQuery.mockReturnValue({
      data: {
        data: {
          sale: {
            lines: [
              { commodity: { id: "maize", name: "Maize" }, id: "l1", unitPriceGhs: null },
              { commodity: { id: "soya", name: "Soya beans" }, id: "l2", unitPriceGhs: null },
            ],
          },
        },
      },
      isLoading: false,
    });

    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);

    expect(await screen.findByText("loaded 1,000 kg")).toBeInTheDocument();
    expect(screen.queryByText("Suggested")).not.toBeInTheDocument();
    expect(paymentBox()).toHaveValue("");
  });
});
