// test/component/PaymentDialog.test.tsx
//
// The dialog that writes money onto a sale's ledger. The backend refuses an
// overpayment, a payment on an unconfirmed sale and a duplicate reference, so
// what is worth pinning HERE is the part the server cannot check for us:
//
//   * that a transfer cannot be filed without the reference and the company
//     account it is reconciled against (the backend's ACCOUNT_REQUIRED and
//     DUPLICATE_REFERENCE arrive too late to be good UX, and a cash payment
//     must NOT be held to the same rule);
//   * that the write is gated on an explicit confirmation, because only an
//     owner reversal can undo it;
//   * that the amount crosses the wire as a NUMBER - it is typed into a text
//     input, and "1500.50" reaching a Decimal column as a string is the kind
//     of thing that works until it doesn't;
//   * that a refused write shows the server's own words. A misplaced decimal
//     answered with "that request wasn't quite right" tells the user nothing.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { pickOption } from "../helpers/pick-option";

import { PaymentDialog } from "@/components/admin/trading/payment-dialog";

const { errorToast, recordTrigger, saleQuery } = vi.hoisted(() => ({
  errorToast: vi.fn(),
  recordTrigger: vi.fn(),
  saleQuery: vi.fn(),
}));

vi.mock("@/redux/sales/admin-sales-api", () => ({
  useGetSaleQuery: () => saleQuery(),
  useRecordSalePaymentMutation: () => [recordTrigger, { isLoading: false }],
}));

// The account select is its own screen with its own query; stub it down to a
// plain input so this file tests the dialog's rules, not the register's.
vi.mock("@/components/admin/payment-account-field", () => ({
  PaymentAccountField: ({
    error,
    registration,
  }: {
    error?: string;
    registration: Record<string, unknown>;
  }) => (
    <label>
      Company account
      <input aria-label="Company account" {...registration} />
      {error ? <span>{error}</span> : null}
    </label>
  ),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: vi.fn() },
}));

/**
 * No inter-keystroke delay. userEvent's default waits between characters, and
 * typing an amount into a radix dialog was slow enough that this file passed
 * alone and timed out at 5s once the suite ran its files in parallel. Nothing
 * here depends on typing being paced.
 */
const userEvent = userEventBase.setup({ delay: null });

/** Every field the dialog reads (see `detail.*` in payment-dialog.tsx). */
const SALE = {
  balanceGhs: 4000,
  beforeLoadingMet: false,
  buyer: { name: "Kwame Owusu" },
  fullyPaid: false,
  id: "sale-1",
  milestones: [],
  paidGhs: 1000,
  requiredBeforeLoadingGhs: 2500,
  transactionNo: "SAL-2026-00042",
};

/**
 * Clicks through the confirmation the dialog raises before it writes.
 *
 * Scoped to the confirmation dialog on purpose: its confirm button carries the
 * SAME label as the form's submit button ("Record payment"), and both are in
 * the document at this point. An unscoped query happens to resolve today only
 * because radix marks the underlying dialog aria-hidden while a second one is
 * open - far too incidental a thing for a money test to lean on.
 */
const confirmWrite = async () => {
  const dialogs = await screen.findAllByRole("dialog");
  const confirmation = dialogs.at(-1);
  if (!confirmation) throw new Error("no confirmation dialog opened");
  await userEvent.click(
    within(confirmation).getByRole("button", { name: "Record payment" }),
  );
};

beforeEach(() => {
  recordTrigger.mockReset();
  errorToast.mockReset();
  recordTrigger.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  saleQuery.mockReturnValue({
    data: { data: { sale: SALE } },
    isLoading: false,
  });
});

describe("PaymentDialog", () => {
  it("will not file a transfer without its reference and company account", async () => {
    render(<PaymentDialog onClose={vi.fn()} open sale={{ id: "sale-1" }} />);

    await pickOption(screen.getByLabelText(/METHOD/i), "Bank transfer");
    await userEvent.type(screen.getByLabelText(/AMOUNT/i), "1500.50");
    await userEvent.click(screen.getByRole("button", { name: /Record/i }));

    expect(
      await screen.findByText(/it is what stops this payment being recorded twice/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/what the bank statement is reconciled against/i),
    ).toBeInTheDocument();
    expect(recordTrigger).not.toHaveBeenCalled();
  });

  it("files a cash payment without either, and sends the amount as a number", async () => {
    render(<PaymentDialog onClose={vi.fn()} open sale={{ id: "sale-1" }} />);

    await userEvent.type(screen.getByLabelText(/AMOUNT/i), "1500.50");
    await userEvent.click(screen.getByRole("button", { name: /Record/i }));
    await confirmWrite();

    expect(recordTrigger).toHaveBeenCalledTimes(1);
    const [[sent]] = recordTrigger.mock.calls as [[{ body: Record<string, unknown> }]];
    expect(sent.body.amountGhs).toBe(1500.5);
    expect(sent.body.method).toBe("CASH");
    // Absent, not empty string: the backend treats "" as a supplied reference.
    expect(sent.body).not.toHaveProperty("reference");
  });

  it("writes nothing when the confirmation is declined", async () => {
    render(<PaymentDialog onClose={vi.fn()} open sale={{ id: "sale-1" }} />);

    await userEvent.type(screen.getByLabelText(/AMOUNT/i), "500");
    await userEvent.click(screen.getByRole("button", { name: /Record/i }));

    const dialogs = await screen.findAllByRole("dialog");
    const confirmation = dialogs.at(-1);
    if (!confirmation) throw new Error("no confirmation dialog opened");
    await userEvent.click(
      within(confirmation).getByRole("button", { name: "Cancel" }),
    );
    expect(recordTrigger).not.toHaveBeenCalled();
  });

  it("shows the server's reason when the write is refused", async () => {
    recordTrigger.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: {
            code: "OVERPAYMENT",
            message:
              "That is more than the balance outstanding on this sale. Check the sale's balance and record the correct amount.",
          },
          status: 400,
        }),
    });

    render(<PaymentDialog onClose={vi.fn()} open sale={{ id: "sale-1" }} />);
    await userEvent.type(screen.getByLabelText(/AMOUNT/i), "999999");
    await userEvent.click(screen.getByRole("button", { name: /Record/i }));
    await confirmWrite();

    expect(errorToast).toHaveBeenCalledWith(
      "Couldn't record the payment",
      expect.objectContaining({
        description: expect.stringContaining("more than the balance outstanding"),
      }),
    );
  });
});
