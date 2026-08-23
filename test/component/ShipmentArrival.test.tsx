// test/component/ShipmentArrival.test.tsx
//
// The dialog that decides what a buyer is actually billed. Grain is weighed at
// the origin and again on arrival, and the two figures differ; billing on the
// origin weight alone bills a number nobody is going to pay.
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
//     the sale - the server's 409 does not name it, and a trip carries several;
//   * neither path writes until its confirmation is cleared, because both are
//     one-way: the trip cannot be put back on the road, and the settled totals
//     become what every buyer on it owes.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { ArrivalDialog } from "@/components/admin/trading/shipment-arrival-dialog";
import type { IShipment } from "@/types/admin-shipment.types";

const { arriveTrigger, figuresTrigger, saleQuery } = vi.hoisted(() => ({
  arriveTrigger: vi.fn(),
  figuresTrigger: vi.fn(),
  saleQuery: vi.fn(),
}));

vi.mock("@/redux/shipments/shipments-api", () => ({
  useArriveShipmentMutation: () => [arriveTrigger, { isLoading: false }],
  useRecordArrivalFiguresMutation: () => [figuresTrigger, { isLoading: false }],
}));

vi.mock("@/redux/sales/admin-sales-api", () => ({
  useGetSaleQuery: (id: string) => saleQuery(id),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

const userEvent = userEventBase.setup({ delay: null });

/**
 * Clears the confirmation raised before either write.
 *
 * Found by the gate's own title and scoped to it: both commit buttons carry
 * the SAME label as the button that opened them, and both are in the document
 * at this point, so an unscoped query would be resolving a collision by luck.
 */
const clearGate = async (title: RegExp, commit: string) => {
  const heading = await screen.findByText(title);
  const gate = heading.closest('[role="dialog"]');
  if (!gate) throw new Error("the gate's title is not inside a dialog");
  await userEvent.click(
    within(gate as HTMLElement).getByRole("button", { name: commit }),
  );
};

/** Submit the figures and clear the gate: what actually reaches the API. */
const recordArrival = async () => {
  await userEvent.click(
    screen.getAllByRole("button", { name: "Record arrival" })[0],
  );
  await clearGate(/Bill these figures/i, "Record arrival");
};

/** Take the "weigh it later" path all the way through. */
const arriveWithoutFigures = async () => {
  await userEvent.click(
    screen.getByRole("button", { name: /mark arrived and record this later/i }),
  );
  await clearGate(/Mark this trip arrived/i, "Mark arrived");
};

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
        // Nothing weighed in yet: the form starts from what was LOADED.
        arrivalLines: [],
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
  figuresTrigger.mockReset();
  figuresTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
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
    await recordArrival();

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
    await recordArrival();

    const [[sent]] = arriveTrigger.mock.calls as [
      [{ sales: { lines: { receivedKg: number }[]; settledTotalGhs: number }[] }],
    ];
    expect(sent.sales[0].settledTotalGhs).toBe(0);
    expect(sent.sales[0].lines.map((l) => l.receivedKg)).toEqual([0, 0]);
  });

  it("marks the trip arrived with no figures at all", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);

    await arriveWithoutFigures();

    // No `sales` key: the load is on the ground either way, and the figures
    // are recorded once somebody has weighed it.
    expect(arriveTrigger).toHaveBeenCalledWith({ id: "shp-1" });
  });

  it("writes nothing until the bill is confirmed, and says what it will bill", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);
    await screen.findByDisplayValue("12000.00");

    await userEvent.click(
      screen.getAllByRole("button", { name: "Record arrival" })[0],
    );

    // A filled form is not a bill. What the gate says is the point of it: the
    // figure every buyer on the trip owes from here on.
    expect(arriveTrigger).not.toHaveBeenCalled();
    expect(await screen.findByText(/Bill these figures/i)).toBeInTheDocument();
    expect(
      screen.getByText(/GH₵ 12,000.00 across 1 sale on SHP-2026-00042/),
    ).toBeInTheDocument();
  });

  it("bills nothing when the confirmation is cancelled", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);
    await screen.findByDisplayValue("12000.00");

    await userEvent.click(
      screen.getAllByRole("button", { name: "Record arrival" })[0],
    );
    const heading = await screen.findByText(/Bill these figures/i);
    const gate = heading.closest('[role="dialog"]') as HTMLElement;
    await userEvent.click(within(gate).getByRole("button", { name: "Cancel" }));

    expect(arriveTrigger).not.toHaveBeenCalled();
    // The figures survive the cancel - the operator went back to check one.
    expect(paymentBox()).toHaveValue("12000.00");
  });

  it("does not mark the trip arrived when that confirmation is cancelled", async () => {
    render(<ArrivalDialog onClose={vi.fn()} shipment={shipment()} />);

    await userEvent.click(
      screen.getByRole("button", { name: /mark arrived and record this later/i }),
    );
    const heading = await screen.findByText(/Mark this trip arrived/i);
    const gate = heading.closest('[role="dialog"]') as HTMLElement;
    await userEvent.click(within(gate).getByRole("button", { name: "Cancel" }));

    expect(arriveTrigger).not.toHaveBeenCalled();
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
    await recordArrival();

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

/**
 * The second pass: a trip already marked arrived, being weighed in afterwards.
 *
 * A truck is routinely marked arrived from the yard, before the weighbridge
 * ticket reaches the office. What is pinned here is that this path posts to
 * the FIGURES endpoint rather than the arrival one - marking a trip arrived
 * twice is not a thing - and that a correction starts from the figures already
 * on the record instead of from what was loaded, which is a different number
 * and would silently undo the first reading.
 */
describe("ArrivalDialog, recording the figures afterwards", () => {
  /** The same trip, weighed in at 900 kg maize and settled at 11,000. */
  const weighedShipment = (): IShipment => {
    const base = shipment();
    return {
      ...base,
      sales: [
        {
          ...base.sales[0],
          arrivalLines: [
            {
              commodityId: "maize",
              commodityName: "Maize",
              dispatchedKg: 1000,
              lossValueGhs: null,
              receivedKg: 900,
            },
          ],
          settledTotalGhs: 11_000,
        },
      ],
      status: "ARRIVED",
    };
  };

  const submitFigures = async () => {
    await userEvent.click(
      screen.getAllByRole("button", { name: "Record figures" })[0],
    );
    await clearGate(/Bill these figures/i, "Record figures");
  };

  it("posts the figures without marking the trip arrived again", async () => {
    render(
      <ArrivalDialog mode="FIGURES" onClose={vi.fn()} shipment={shipment()} />,
    );

    await userEvent.clear(maizeBox());
    await userEvent.type(maizeBox(), "950");
    await userEvent.clear(soyaBox());
    await userEvent.type(soyaBox(), "500");
    await submitFigures();

    expect(arriveTrigger).not.toHaveBeenCalled();
    expect(figuresTrigger).toHaveBeenCalledTimes(1);
    expect(figuresTrigger.mock.calls[0][0]).toEqual({
      id: "shp-1",
      sales: [
        {
          lines: [
            { commodityId: "maize", receivedKg: 950 },
            { commodityId: "soya", receivedKg: 500 },
          ],
          saleId: "sale-1",
          settledTotalGhs: 11_500,
        },
      ],
    });
  });

  it("starts a correction from what was already recorded, not from what was loaded", async () => {
    render(
      <ArrivalDialog
        mode="FIGURES"
        onClose={vi.fn()}
        shipment={weighedShipment()}
      />,
    );

    // 900, the figure on the record - not the 1,000 that went on the truck.
    expect(maizeBox()).toHaveValue("900");
    expect(paymentBox()).toHaveValue("11000.00");
  });

  it("offers no way to skip the figures - the trip has already arrived", async () => {
    render(
      <ArrivalDialog mode="FIGURES" onClose={vi.fn()} shipment={shipment()} />,
    );

    expect(
      screen.queryByRole("button", {
        name: /mark arrived and record this later/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Mark arrived" }),
    ).not.toBeInTheDocument();
  });
});
