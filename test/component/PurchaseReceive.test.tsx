// test/component/PurchaseReceive.test.tsx
//
// Taking delivery of a purchase, and the fork that decides whether a warehouse
// balance moves at all.
//
// Most of what is bought at the farm gate is driven straight to the buyer and
// never enters a shed. Booking those goods through a warehouse puts two
// movements against a floor they never stood on, so the receipt has to be able
// to say "no warehouse" - and what is pinned here is what neither the schema
// nor the server can say for itself:
//
//   * the shed route sends a warehouseId and never the direct flag;
//   * the direct route sends `direct: true` and NO warehouseId, because a body
//     carrying both is refused as describing two different events;
//   * the warehouse picker is not merely optional on the direct route, it is
//     gone - an unused required field would block the submit;
//   * the confirmation names where the goods will actually be, since that is
//     the part nobody can check afterwards from the weight alone.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { ReceiveDialog } from "@/components/admin/purchases/purchase-detail";
import { PurchaseStatus, type IPurchase } from "@/types/purchase.types";

const { receiveTrigger } = vi.hoisted(() => ({ receiveTrigger: vi.fn() }));

vi.mock("@/redux/purchases/purchases-api", () => ({
  useGetPurchaseQuery: () => ({ data: undefined, isLoading: false }),
  useMarkPurchaseInTransitMutation: () => [vi.fn(), { isLoading: false }],
  useReceivePurchaseMutation: () => [receiveTrigger, { isLoading: false }],
  useVoidPurchaseMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/redux/warehouses/warehouses-api", () => ({
  useGetWarehousesQuery: () => ({
    data: { data: [{ id: "w-1", name: "Tamale Main" }] },
  }),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

const userEvent = userEventBase.setup({ delay: null });

const purchase = (): IPurchase =>
  ({
    commodity: { id: "maize", name: "Maize" },
    id: "pur-1",
    status: PurchaseStatus.RECORDED,
    supplier: { id: "sup-1", name: "Alhassan Fuseini" },
    transactionNo: "PUR-2026-00317",
    warehouse: null,
    weightKg: 1000,
  }) as unknown as IPurchase;

/**
 * The dialog and the confirmation it raises are both in the document at once,
 * and both carry a control by this name - the same collision the other dialog
 * suites resolve by taking the first.
 */
const only = (name: RegExp, role = "radio") =>
  screen.getAllByRole(role, { name })[0];

/** Submit and clear the confirmation, which is what actually writes. */
const submit = async (commit: RegExp) => {
  await userEvent.click(screen.getAllByRole("button", { name: commit })[0]);
  const heading = await screen.findByText(
    /Book this stock in\?|Take these goods on\?/i,
  );
  const gate = heading.closest('[role="dialog"]');
  if (!gate) throw new Error("the gate's title is not inside a dialog");
  await userEvent.click(
    within(gate as HTMLElement).getByRole("button", { name: commit }),
  );
};

/** The body the API was called with. */
const sentBody = () =>
  (receiveTrigger.mock.calls[0]?.[0] as { body: Record<string, unknown> }).body;

beforeEach(() => {
  receiveTrigger.mockReset();
  receiveTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
});

describe("receiving into a warehouse", () => {
  it("sends the shed and never the direct flag", async () => {
    render(<ReceiveDialog purchase={purchase()} open onClose={vi.fn()} />);

    await userEvent.click(only(/warehouse/i, "combobox"));
    await userEvent.click(screen.getAllByRole("option", { name: "Tamale Main" })[0]);
    await submit(/Receive stock/i);

    expect(receiveTrigger).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ receivedKg: 1000, warehouseId: "w-1" });
    expect(sentBody()).not.toHaveProperty("direct");
  });
});

describe("receiving straight onto a truck", () => {
  it("sends the direct flag and no warehouse", async () => {
    render(<ReceiveDialog purchase={purchase()} open onClose={vi.fn()} />);

    await userEvent.click(only(/Straight to a buyer/i));
    await submit(/Take them on/i);

    expect(receiveTrigger).toHaveBeenCalledTimes(1);
    expect(sentBody()).toMatchObject({ direct: true, receivedKg: 1000 });
    // Both together is refused by the API as two different events; the form
    // must not send a warehouse it has already said the goods never reach.
    expect(sentBody()).not.toHaveProperty("warehouseId");
  });

  it("takes the warehouse picker away rather than leaving it unused", async () => {
    render(<ReceiveDialog purchase={purchase()} open onClose={vi.fn()} />);

    expect(only(/warehouse/i, "combobox")).toBeVisible();
    await userEvent.click(only(/Straight to a buyer/i));
    expect(
      screen.queryAllByRole("combobox", { name: /warehouse/i }),
    ).toHaveLength(0);
  });

  it("says where the goods will stand before it writes anything", async () => {
    render(<ReceiveDialog purchase={purchase()} open onClose={vi.fn()} />);

    await userEvent.click(only(/Straight to a buyer/i));
    await userEvent.click(
      screen.getAllByRole("button", { name: /Take them on/i })[0],
    );

    expect(
      (await screen.findAllByText(/becomes yours where it stands at Alhassan/i))[0],
    ).toBeVisible();
    // Nothing is written until the gate is cleared.
    expect(receiveTrigger).not.toHaveBeenCalled();
  });
});
