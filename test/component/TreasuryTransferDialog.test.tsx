// test/component/TreasuryTransferDialog.test.tsx
//
// Moving money between the company's OWN accounts (collection -> payout).
// Less dangerous than a send - the money cannot leave the business - but it
// is still a Hubtel write with an idempotency key, and the amount is typed
// into a text input on its way to a Decimal column, so the same three pins
// as the send dialog apply: pesewas-precision validation before the wire,
// the amount crossing as a NUMBER under a stable key, and a refused write
// answered with the server's words rather than a shrug.
//
// The dialog is module-private to treasury-screen.tsx, so it is driven the
// way a person reaches it: render the screen, click "Move funds across".
// The RTK hooks are mocked at the boundary like PaymentDialog.test.tsx; the
// transfers register renders its honest empty state, keeping the table
// machinery out of this file's scope.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEventBase from "@testing-library/user-event";

import { TreasuryScreen } from "@/components/admin/treasury/treasury-screen";

const { createTransfer, errorToast, successToast } = vi.hoisted(() => ({
  createTransfer: vi.fn(),
  errorToast: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock("@/redux/treasury/treasury-api", () => ({
  useCreateBalanceTransferMutation: () => [createTransfer, { isLoading: false }],
  useGetBalanceTransfersQuery: () => ({
    data: { data: [], meta: { total: 0 } },
    isFetching: false,
  }),
  useGetTreasuryQuery: () => ({
    data: {
      data: {
        treasury: {
          collection: {
            accountNumber: "0301000001",
            amountGhs: 12000,
            fetchedAt: "2026-08-01T10:00:00.000Z",
          },
          configured: true,
          disbursement: {
            accountNumber: "0301000002",
            amountGhs: 150,
            fetchedAt: "2026-08-01T10:00:00.000Z",
          },
        },
      },
    },
    error: undefined,
    isFetching: false,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

// The screen's register uses useTableQuery, which needs the router seam.
vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/treasury",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: errorToast, success: successToast },
}));

const userEvent = userEventBase.setup({ delay: null });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const openDialog = async () => {
  render(<TreasuryScreen />);
  await userEvent.click(
    screen.getByRole("button", { name: "Move funds across" }),
  );
  return screen.findByRole("dialog");
};

const move = () =>
  userEvent.click(screen.getByRole("button", { name: "Move funds" }));

beforeEach(() => {
  sessionStorage.clear();
  createTransfer.mockReset();
  errorToast.mockReset();
  successToast.mockReset();
  createTransfer.mockReturnValue({
    unwrap: () => Promise.resolve({ message: "Transfer submitted to Hubtel" }),
  });
});

describe("TransferDialog - amount validation", () => {
  it("refuses an empty or non-positive amount", async () => {
    await openDialog();

    await userEvent.type(
      screen.getByLabelText(/What is it for/i),
      "Weekly top-up",
    );
    await move();
    expect(await screen.findByText(/Enter the amount/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "0");
    await move();
    expect(
      await screen.findByText(/must be more than zero/i),
    ).toBeInTheDocument();
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it("refuses sub-pesewa precision before it can reach the ledger", async () => {
    await openDialog();

    // Three decimals is not money in this system; Hubtel and the ledger
    // both count pesewas, and rounding client-side would move a different
    // amount than the one typed.
    await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "2000.005");
    await userEvent.type(
      screen.getByLabelText(/What is it for/i),
      "Weekly top-up",
    );
    await move();

    expect(
      await screen.findByText(/2 decimal places \(pesewas\)/i),
    ).toBeInTheDocument();
    expect(createTransfer).not.toHaveBeenCalled();
  });

  it("requires a description of what the movement is for", async () => {
    await openDialog();

    await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "2000.00");
    await move();

    expect(
      await screen.findByText(/Say what this transfer is for/i),
    ).toBeInTheDocument();
    expect(createTransfer).not.toHaveBeenCalled();
  });
});

describe("TransferDialog - the write", () => {
  it("sends the amount as a NUMBER under a per-opening idempotency key", async () => {
    await openDialog();

    await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "2000.50");
    await userEvent.type(
      screen.getByLabelText(/What is it for/i),
      "Weekly top-up for field payouts",
    );
    await move();

    expect(createTransfer).toHaveBeenCalledTimes(1);
    const [call] = createTransfer.mock.calls[0] as [
      { body: Record<string, unknown>; idempotencyKey: string },
    ];
    expect(call.body).toEqual({
      amountGhs: 2000.5,
      description: "Weekly top-up for field payouts",
    });
    // Same rule as a send: retrying a timed-out move must resolve to ONE
    // movement, so the key must exist and be stable per opening.
    expect(call.idempotencyKey).toMatch(UUID_RE);
  });

  it("closes and reports success in the server's words", async () => {
    await openDialog();

    await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "500");
    await userEvent.type(
      screen.getByLabelText(/What is it for/i),
      "Top-up before market day",
    );
    await move();

    expect(successToast).toHaveBeenCalledWith("Transfer submitted to Hubtel");
    expect(
      screen.queryByRole("heading", { name: "Move funds across" }),
    ).not.toBeInTheDocument();
  });

  it("shows the server's reason when the move is refused, and stays open", async () => {
    createTransfer.mockReturnValue({
      unwrap: () =>
        Promise.reject({
          data: {
            message:
              "The collection account cannot cover this transfer right now.",
          },
          status: 409,
        }),
    });
    await openDialog();

    await userEvent.type(screen.getByLabelText(/Amount \(GH/i), "999999");
    await userEvent.type(
      screen.getByLabelText(/What is it for/i),
      "Weekly top-up",
    );
    await move();

    expect(errorToast).toHaveBeenCalledWith(
      "The collection account cannot cover this transfer right now.",
    );
    // Still open: the typed values are the retry, closing would discard them.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
