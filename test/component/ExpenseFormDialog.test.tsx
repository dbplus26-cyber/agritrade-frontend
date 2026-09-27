// test/component/ExpenseFormDialog.test.tsx
//
// Recording a cost pays it in the same act, which makes this a form that
// moves money rather than one that only writes a row. Three things follow,
// and they are what this file pins:
//
//   * every submission carries an idempotency key, and a retry after a failed
//     one carries the SAME key. Without that, a double tap or a resend on a
//     bad line pays the same supplier twice, and no amount of care at the
//     keyboard can undo it;
//   * "paying later" must send no payment at all - not a zeroed one - because
//     an expense with a payment row of any kind is a cost somebody has been
//     told is settled;
//   * a transfer is refused here rather than by the server, which answers
//     with REFERENCE_REQUIRED / ACCOUNT_REQUIRED too late to be good UX; cash
//     is held to neither rule, since it leaves the office till.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { pickOption } from "../helpers/pick-option";

import { ExpenseFormDialog } from "@/components/admin/expenses/expense-form";

const {
  createExpense,
  errorToast,
  moneyVisibility,
  successToast,
  updateExpense,
} = vi.hoisted(() => ({
  createExpense: vi.fn(),
  errorToast: vi.fn(),
  moneyVisibility: { enabled: true },
  successToast: vi.fn(),
  updateExpense: vi.fn(),
}));

vi.mock("@/redux/expenses/expenses-api", () => ({
  useCreateExpenseMutation: () => [createExpense, { isLoading: false }],
  useGetMatchableOutflowsQuery: () => ({
    data: {
      data: [
        {
          account: { kind: "MOMO", label: "Wallet" },
          amountGhs: 300,
          id: "b10e20ef-1111-4111-8111-111111111111",
          occurredAt: "2026-09-20T10:00:00.000Z",
          reason: "Driver part 1",
          transactionNo: "CMV-2026-00001",
        },
        {
          account: { kind: "MOMO", label: "Wallet" },
          amountGhs: 250,
          id: "b10e20ef-2222-4222-8222-222222222222",
          occurredAt: "2026-09-21T10:00:00.000Z",
          reason: "Driver part 2",
          transactionNo: "CMV-2026-00002",
        },
        {
          account: { kind: "MOMO", label: "Wallet" },
          amountGhs: 400,
          id: "b10e20ef-3333-4333-8333-333333333333",
          occurredAt: "2026-09-22T10:00:00.000Z",
          reason: "Driver part 3",
          transactionNo: "CMV-2026-00003",
        },
      ],
    },
    isFetching: false,
    isError: false,
  }),
  useUpdateExpenseMutation: () => [updateExpense, { isLoading: false }],
}));

// The account picker is its own screen with its own query (and its own test
// file); stubbed to a plain input so this file tests the form's rules.
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

// The form builds its own schema from the settlement list, because the
// reference rule turns on whether the chosen account belongs to a person. Only
// company accounts here: the held-account exemption is covered at the schema,
// in test/unit/expense-schema.test.ts.
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
vi.mock("@/hooks/use-money-visibility", () => ({
  useMoneyVisibility: () => moneyVisibility.enabled,
}));

const userEvent = userEventBase.setup({ delay: null });

const CATEGORIES = [{ id: "cat-rent", name: "Rent" }];

type CreateCall = [{ body: Record<string, unknown>; idempotencyKey: string }];

const sent = (call = 0) =>
  (createExpense.mock.calls[call] as unknown as CreateCall)[0];

const renderDialog = () =>
  render(
    <ExpenseFormDialog
      categories={CATEGORIES as never}
      onOpenChange={vi.fn()}
      open
    />,
  );

const fillCost = async () => {
  await pickOption(screen.getByLabelText(/Category/i), "Rent");
  await userEvent.type(screen.getByLabelText(/Amount/i), "850.00");
};

const submit = () =>
  userEvent.click(screen.getByRole("button", { name: "Record expense" }));

beforeEach(() => {
  moneyVisibility.enabled = true;
  createExpense.mockReset();
  updateExpense.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
  createExpense.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        data: { expense: { id: "e1" }, settlement: { status: "PAID" } },
      }),
  });
});

describe("ExpenseFormDialog", () => {
  it("leaves a new cost owed by default, and keys the submission", async () => {
    renderDialog();

    await fillCost();
    await submit();

    expect(createExpense).toHaveBeenCalledTimes(1);
    const { body, idempotencyKey } = sent();
    expect(idempotencyKey).toBeTruthy();
    // A number, not the typed string: "850.00" reaching a Decimal column as
    // text is the kind of thing that works until it doesn't.
    expect(body.amountGhs).toBe(850);
    expect(body).not.toHaveProperty("payment");
  });

  it("only creates a new account debit after an explicit choice", async () => {
    renderDialog();

    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Already paid" }));
    expect(
      screen.getByRole("button", { name: "Match existing debit" }),
    ).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Record a new debit" }),
    );
    await submit();

    expect(sent().body.payment).toEqual({
      method: "CASH",
      paidAt: expect.any(String),
    });
  });

  it("keeps new payment available when existing debits are not visible", async () => {
    moneyVisibility.enabled = false;
    renderDialog();
    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Pay now" }));
    expect(
      screen.queryByRole("button", { name: "Match existing debit" }),
    ).not.toBeInTheDocument();
    await submit();
    expect(sent().body.payment).toMatchObject({ method: "CASH" });
  });

  it("will not file a transfer without its account and reference", async () => {
    renderDialog();

    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Already paid" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Record a new debit" }),
    );
    await pickOption(
      screen.getByLabelText(/How it was paid/i),
      "Bank transfer",
    );
    await submit();

    expect(
      await screen.findByText(/what the statement is reconciled against/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/stops this payment being recorded twice/i),
    ).toBeInTheDocument();
    expect(createExpense).not.toHaveBeenCalled();
  });

  it("sends a transfer once it names both", async () => {
    renderDialog();

    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Already paid" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Record a new debit" }),
    );
    await pickOption(
      screen.getByLabelText(/How it was paid/i),
      "Bank transfer",
    );
    await userEvent.type(screen.getByLabelText("Account"), "acc-1");
    await userEvent.type(screen.getByLabelText(/Reference/i), "TRF884512");
    await submit();

    expect(sent().body.payment).toMatchObject({
      method: "BANK",
      paymentAccountId: "acc-1",
      reference: "TRF884512",
    });
  });

  it("reuses the same key when a failed submission is retried", async () => {
    createExpense.mockReturnValueOnce({
      unwrap: () =>
        Promise.reject({
          data: { message: "The office line is busy." },
          status: 503,
        }),
    });
    renderDialog();

    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Already paid" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Record a new debit" }),
    );
    await submit();
    expect(errorToast).toHaveBeenCalled();

    await submit();

    expect(createExpense).toHaveBeenCalledTimes(2);
    // The retry is the same expense: one key, one payment, whatever the line
    // did in between.
    expect(sent(1).idempotencyKey).toBe(sent(0).idempotencyKey);
  });

  it("matches two existing debits without requesting a new payment", async () => {
    renderDialog();
    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Already paid" }));
    await pickOption(screen.getByLabelText(/How it was paid/i), "Mobile money");
    await userEvent.type(screen.getByLabelText("Account"), "acc-1");
    await userEvent.click(screen.getByLabelText(/CMV-2026-00001/i));
    await userEvent.click(screen.getByLabelText(/CMV-2026-00002/i));
    await submit();
    expect(sent().body).not.toHaveProperty("payment");
    expect(sent().body.existingMovementIds).toEqual([
      "b10e20ef-1111-4111-8111-111111111111",
      "b10e20ef-2222-4222-8222-222222222222",
    ]);
  });

  it("refuses existing debits that exceed the cost", async () => {
    renderDialog();
    await fillCost();
    await userEvent.click(screen.getByRole("button", { name: "Already paid" }));
    await pickOption(screen.getByLabelText(/How it was paid/i), "Mobile money");
    await userEvent.type(screen.getByLabelText("Account"), "acc-1");
    await userEvent.click(screen.getByLabelText(/CMV-2026-00001/i));
    await userEvent.click(screen.getByLabelText(/CMV-2026-00002/i));
    await userEvent.click(screen.getByLabelText(/CMV-2026-00003/i));
    await submit();
    expect(createExpense).not.toHaveBeenCalled();
    expect(errorToast).toHaveBeenCalledWith(
      "The selected debits exceed this expense's amount.",
    );
  });
});
