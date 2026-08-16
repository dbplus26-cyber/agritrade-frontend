// test/component/DriverPaymentsCard.test.tsx
//
// A driver's money on the driver's own record. The system emails a payment
// receipt to drivers who have an address; plenty do not, and those are exactly
// the people who walk into the office to ask. What is pinned here is that the
// walk-in gets served:
//
//   * every payment made to this driver is listed, naming the trip it settled,
//     with a link to the voucher for each one;
//   * the card says whether anything was emailed, and to where, so nobody has
//     to guess whether the driver already has a copy;
//   * redaction degrades to "Hidden" rather than a blank or a zero - a staff
//     member without financial visibility still sees WHICH payments exist;
//   * an empty history says so instead of rendering an empty ledger.
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { DriverPaymentsCard } from "@/components/admin/drivers/driver-payments-card";
import type {
  IDriverPaymentLedgerRow,
  IDriverPaymentsResponse,
} from "@/types/driver-settlement.types";

const { paymentsQuery } = vi.hoisted(() => ({ paymentsQuery: vi.fn() }));

vi.mock("@/redux/drivers/drivers-api", () => ({
  useGetDriverPaymentsQuery: (...args: unknown[]) =>
    paymentsQuery(...args) as unknown,
}));

const row = (
  overrides: Partial<IDriverPaymentLedgerRow> = {},
): IDriverPaymentLedgerRow => ({
  amountGhs: 400,
  id: "pay-1",
  isReversal: false,
  method: "CASH",
  paidAt: "2026-08-04T00:00:00.000Z",
  paymentAccount: null,
  reference: null,
  reversalReason: null,
  reversedByPaymentId: null,
  shipment: { destination: "Accra", id: "trip-1", transactionNo: "SHP-2026-0001" },
  transactionNo: "DRP-2026-00042",
  ...overrides,
});

const answer = (
  rows: IDriverPaymentLedgerRow[],
  summary: Partial<IDriverPaymentsResponse["summary"]> = {},
) => ({
  data: {
    data: rows,
    message: "Payments made to this driver",
    meta: { limit: 20, page: 1, total: rows.length, totalPages: 1 },
    summary: {
      driverEmail: null,
      driverName: "Kojo Mensah",
      paidGhs: rows.reduce((sum, r) => sum + (r.amountGhs ?? 0), 0),
      ...summary,
    },
  },
  error: undefined,
  isError: false,
  isFetching: false,
  isLoading: false,
  refetch: vi.fn(),
});

describe("DriverPaymentsCard", () => {
  it("lists each payment with its trip and a link to its voucher", () => {
    paymentsQuery.mockReturnValue(
      answer([
        row(),
        row({
          amountGhs: 250,
          id: "pay-2",
          shipment: {
            destination: "Kumasi",
            id: "trip-2",
            transactionNo: "SHP-2026-0002",
          },
          transactionNo: "DRP-2026-00043",
        }),
      ]),
    );
    render(<DriverPaymentsCard driverId="driver-1" />);

    expect(screen.getByText("DRP-2026-00042")).toBeInTheDocument();
    expect(screen.getByText("DRP-2026-00043")).toBeInTheDocument();
    expect(screen.getByText(/Accra/)).toBeInTheDocument();
    expect(screen.getByText(/Kumasi/)).toBeInTheDocument();

    // The receipt is the point of the whole screen: one per payment, pointing
    // at the server-rendered voucher rather than at a printed page.
    const vouchers = screen.getAllByRole("link", { name: /receipt/i });
    expect(vouchers).toHaveLength(2);
    expect(vouchers[0]).toHaveAttribute(
      "href",
      expect.stringContaining("/admin/receipts/driver-payment/pay-1.pdf"),
    );
  });

  it("says the receipts were emailed, and where, when there is an address", () => {
    paymentsQuery.mockReturnValue(
      answer([row()], { driverEmail: "kojo@example.com" }),
    );
    render(<DriverPaymentsCard driverId="driver-1" />);

    expect(screen.getByText(/kojo@example.com/)).toBeInTheDocument();
  });

  it("says no receipt was emailed when the driver has no address on file", () => {
    paymentsQuery.mockReturnValue(answer([row()], { driverEmail: null }));
    render(<DriverPaymentsCard driverId="driver-1" />);

    expect(screen.getByText(/no email address on file/i)).toBeInTheDocument();
  });

  it("prints Hidden rather than a blank for a reader who cannot see money", () => {
    paymentsQuery.mockReturnValue(
      answer([row({ amountGhs: null })], { paidGhs: null }),
    );
    render(<DriverPaymentsCard driverId="driver-1" />);

    // The row is still there - who was paid and when is operational.
    expect(screen.getByText("DRP-2026-00042")).toBeInTheDocument();
    expect(screen.getAllByText("Hidden").length).toBeGreaterThan(0);
  });

  it("says nothing has been paid rather than drawing an empty ledger", () => {
    paymentsQuery.mockReturnValue(answer([]));
    render(<DriverPaymentsCard driverId="driver-1" />);

    expect(screen.getByText(/no payments/i)).toBeInTheDocument();
  });

  it("stays silent when the driver itself is gone, but speaks up otherwise", () => {
    const failed = (status: number) => ({
      data: undefined,
      error: { status, data: {} },
      isError: true,
      isFetching: false,
      isLoading: false,
      refetch: vi.fn(),
    });

    // The record above this card already carries the "no such driver" message.
    paymentsQuery.mockReturnValue(failed(404));
    const { container, unmount } = render(
      <DriverPaymentsCard driverId="driver-1" />,
    );
    expect(container).toBeEmptyDOMElement();
    unmount();

    // A real failure is never swallowed - money missing from a screen must
    // look different from money that is not there.
    paymentsQuery.mockReturnValue(failed(500));
    render(<DriverPaymentsCard driverId="driver-1" />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
