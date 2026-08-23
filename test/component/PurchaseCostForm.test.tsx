// test/component/PurchaseCostForm.test.tsx
//
// Recording a cost against a purchase decides something that cannot be undone:
// whether the money rides on the goods to cost of sales, or lands in this
// month's costs. Four things follow, and they are what this file pins:
//
//   * the default is the goods, because that is what nearly all of these are -
//     haulage, loading, porters - but it is SENT explicitly, so the server's
//     own default can never be what silently decided it;
//   * the other answer is reachable and sends the opposite, or the choice is
//     decoration;
//   * every submission carries an idempotency key, and a retry after a failed
//     one carries the SAME key. A cost that lands twice is charged into the
//     goods twice and only a void takes it back off;
//   * the money question is asked HERE. Paying the loading boys at the farm
//     gate is the ordinary case, and a form that could only record the cost as
//     owed sent everybody to a second screen - which is how a cost sat owed on
//     the books while the cash had demonstrably gone.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { pickOption } from "../helpers/pick-option";

import { PurchaseCostDialog } from "@/components/admin/purchases/purchase-cost-form";

const { addCost, errorToast, successToast } = vi.hoisted(() => ({
  addCost: vi.fn(),
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock("@/redux/purchases/purchases-api", () => ({
  useAddPurchaseCostMutation: () => [addCost, { isLoading: false }],
}));

// The picker is covered on its own (test/component/PaymentAccountField.test.tsx);
// stubbed to a plain input so this file tests the form's rules.
vi.mock("@/components/admin/payment-account-field", () => ({
  PaymentAccountField: ({
    error,
    onChange,
    value,
  }: {
    error?: string;
    onChange: (v: string) => void;
    value: string;
  }) => (
    <label>
      Account
      <input
        aria-label="Account"
        onChange={(e) => {
          onChange(e.target.value);
        }}
        value={value}
      />
      {error ? <span>{error}</span> : null}
    </label>
  ),
}));

// The form builds its schema from the settlement list, because the reference
// rule turns on whether the chosen account belongs to a person.
vi.mock("@/redux/payment-accounts/payment-accounts-api", () => ({
  useGetSettlementAccountsQuery: () => ({
    data: {
      data: {
        accounts: [
          {
            holder: null,
            id: "3d0c9f0e-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
            kind: "BANK",
            label: "Ecobank - main operating",
          },
        ],
      },
    },
  }),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: successToast },
}));

const userEvent = userEventBase.setup({ delay: null });

const CATEGORIES = [{ id: "cat-haulage", name: "Haulage" }];

type AddCall = [
  { body: Record<string, unknown>; idempotencyKey: string; purchaseId: string },
];

const sent = (call = 0) =>
  (addCost.mock.calls[call] as unknown as AddCall)[0];

const renderDialog = () =>
  render(
    <PurchaseCostDialog
      categories={CATEGORIES as never}
      onOpenChange={vi.fn()}
      open
      purchaseId="pur-1"
    />,
  );

const fillCost = async (amount = "400.00") => {
  await pickOption(screen.getByLabelText(/Category/i), "Haulage");
  await userEvent.type(screen.getByLabelText(/Amount/i), amount);
};

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Record cost" }));

beforeEach(() => {
  addCost.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
  addCost.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { expense: { id: "e1" }, settlement: { status: "UNPAID" } },
      }),
  });
});

describe("PurchaseCostDialog", () => {
  it("takes the cost into the goods by default, and keys the submission", async () => {
    renderDialog();

    await fillCost();
    await submit();

    expect(addCost).toHaveBeenCalledTimes(1);
    const { body, idempotencyKey, purchaseId } = sent();
    expect(purchaseId).toBe("pur-1");
    expect(idempotencyKey).toBeTruthy();
    // A number, not the typed string: "400.00" reaching a Decimal column as
    // text is the kind of thing that works until it doesn't.
    expect(body.amountGhs).toBe(400);
    // Sent, not left to the server's default. The treatment is unchangeable,
    // so which end of the wire chose it has to be this one.
    expect(body.capitalise).toBe(true);
  });

  it("sends the other treatment when the cost belongs to the month", async () => {
    renderDialog();

    await fillCost();
    await userEvent.click(screen.getByLabelText(/A cost of this month/i));
    await submit();

    expect(sent().body.capitalise).toBe(false);
  });

  it("settles the cost in the same act, by default", async () => {
    renderDialog();

    await fillCost();
    await submit();

    // Cash out of the till: no account, no reference, and the server settles
    // the whole amount, which is why no figure is repeated here.
    expect(sent().body.payment).toEqual({
      method: "CASH",
      paidAt: expect.any(String),
    });
  });

  it("records it as owed when the money has not gone yet", async () => {
    renderDialog();

    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Paying later" }));
    await submit();

    expect(sent().body).not.toHaveProperty("payment");
  });

  it("carries the account and reference on a transfer", async () => {
    renderDialog();

    await fillCost();
    await pickOption(screen.getByLabelText(/How it was paid/i), "Bank transfer");
    await userEvent.type(
      screen.getByLabelText("Account"),
      "3d0c9f0e-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
    );
    await userEvent.type(screen.getByLabelText(/Reference/i), "TRF884512");
    await submit();

    expect(sent().body.payment).toMatchObject({
      method: "BANK",
      paymentAccountId: "3d0c9f0e-1a2b-4c5d-8e9f-0a1b2c3d4e5f",
      reference: "TRF884512",
    });
  });

  it("refuses a transfer with no account, before the round trip", async () => {
    renderDialog();

    await fillCost();
    await pickOption(screen.getByLabelText(/How it was paid/i), "Bank transfer");
    await submit();

    expect(addCost).not.toHaveBeenCalled();
    expect(
      await screen.findByText(/Say where this money came from/i),
    ).toBeInTheDocument();
  });

  it("reports what the SERVER settled, not what the form asked for", async () => {
    // The form can ask to pay and still be told the cost stands owed - a
    // replayed submission answers with the cost that already exists. The
    // message follows the answer, never the request.
    renderDialog();

    await fillCost();
    await submit();

    expect(successToast).toHaveBeenCalledWith(
      expect.stringContaining("part of what these goods cost"),
      expect.objectContaining({
        description: expect.stringContaining("Nothing has gone out yet"),
      }),
    );
  });

  it("says the money has gone when the server says it has", async () => {
    addCost.mockReturnValue({
      unwrap: () =>
        Promise.resolve({
          data: { expense: { id: "e1" }, settlement: { status: "PAID" } },
        }),
    });
    renderDialog();

    await fillCost();
    await submit();

    expect(successToast).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        description: expect.stringContaining("taken off the account"),
      }),
    );
  });

  it("refuses a third decimal place before the round trip", async () => {
    renderDialog();

    await fillCost("400.005");
    await submit();

    expect(
      await screen.findByText(/2 decimal places \(pesewas\)/i),
    ).toBeInTheDocument();
    expect(addCost).not.toHaveBeenCalled();
  });

  it("will not file a cost with no category", async () => {
    renderDialog();

    await userEvent.type(screen.getByLabelText(/Amount/i), "400");
    await submit();

    expect(await screen.findByText("Choose a category")).toBeInTheDocument();
    expect(addCost).not.toHaveBeenCalled();
  });

  it("reuses the same key when a failed submission is retried", async () => {
    addCost.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: { message: "The office line is busy." },
          status: 503,
        }),
    });
    renderDialog();

    await fillCost();
    await submit();
    expect(errorToast).toHaveBeenCalled();

    await submit();

    expect(addCost).toHaveBeenCalledTimes(2);
    // The retry is the same cost: one key, one voucher, whatever the line did
    // in between.
    expect(sent(1).idempotencyKey).toBe(sent(0).idempotencyKey);
  });

  it("says so when the purchase has been struck out underneath it", async () => {
    addCost.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: {
            code: "PURCHASE_VOIDED",
            message:
              "This purchase was voided, so nothing can be charged against it.",
          },
          status: 409,
        }),
    });
    renderDialog();

    await fillCost();
    await submit();

    expect(errorToast).toHaveBeenCalledWith(
      "This purchase was voided",
      expect.objectContaining({
        description: expect.stringContaining("nothing can be charged"),
      }),
    );
  });
});
