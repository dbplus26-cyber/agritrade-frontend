// test/component/SaleSettledTotal.test.tsx
//
// A sale carries two totals: what both sides shook hands on, and what the
// buyer will actually pay once the load was re-weighed on arrival. What is
// pinned here is the pair of rules that make that safe to look at:
//
//   * the agreed figure is NEVER overwritten - the owner has to read the
//     original agreement beside what was finally collected;
//   * where nothing has been weighed, the agreed figure stands ALONE. Not an
//     empty cell, and above all not a zero, which is a real settlement (a
//     delivery refused outright) and must not be faked;
//   * every "what is owed" and "paid in full" on the screen is measured
//     against the settled figure once there is one. The API's own balanceGhs
//     still counts against the agreement, so a sale settled down and paid in
//     full would otherwise read as a debtor on one screen and square on
//     another.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { SaleDetail } from "@/components/admin/trading/sale-detail";
import { SaleInvoice } from "@/components/admin/trading/sale-invoice";

const { saleQuery } = vi.hoisted(() => ({ saleQuery: vi.fn() }));

vi.mock("@/redux/sales/admin-sales-api", () => ({
  saleInvoicePdfUrl: () => "/pdf",
  useCancelSaleMutation: () => [vi.fn(), { isLoading: false }],
  useConfirmSaleMutation: () => [vi.fn(), { isLoading: false }],
  useGetSaleQuery: () => saleQuery(),
  useRecordSalePaymentMutation: () => [vi.fn(), { isLoading: false }],
  useReverseSalePaymentMutation: () => [vi.fn(), { isLoading: false }],
}));

vi.mock("@/redux/settings/settings-api", () => ({
  useGetSettingsQuery: () => ({ data: undefined }),
}));

vi.mock("@/redux/payment-accounts/payment-accounts-api", () => ({
  useGetPayableAccountsQuery: () => ({ data: undefined }),
}));

// The letterhead runs its own branding query. It is chrome on a document
// about money; stubbed so this file does not need a live store for it.
vi.mock("@/components/admin/document-marks", () => ({
  AuthorisedSignature: () => null,
  DocumentLogo: () => null,
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ has: () => true, known: true }),
}));

vi.mock("@/hooks/use-auth-role", () => ({
  useAuthRole: () => ({
    hasRole: () => false,
    isAgent: false,
    isStaff: false,
    isSuperAdmin: false,
    role: null,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/sales/sale-1",
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), success: vi.fn() },
}));

/** A sale agreed at 12,000 and paid to 11,760 - the arrival decides the rest. */
const sale = (over: Record<string, unknown> = {}) => ({
  agreedTotalGhs: 12_000,
  balanceGhs: 240, // The API's own figure, still measured against the agreement.
  beforeLoadingMet: true,
  buyer: { id: "buyer-1", name: "Kofi Trading", phone: null },
  cancelledAt: null,
  cancelReason: null,
  completedAt: null,
  confirmedAt: "2026-07-01T00:00:00.000Z",
  createdAt: "2026-07-01T00:00:00.000Z",
  fullyPaid: false,
  id: "sale-1",
  lines: [],
  milestones: [],
  notes: null,
  paidGhs: 11_760,
  payments: [],
  paymentPolicy: null,
  requiredBeforeLoadingGhs: null,
  settledTotalGhs: 11_760,
  shipments: [],
  status: "FULFILLED",
  transactionNo: "SAL-2026-00011",
  updatedAt: "2026-07-01T00:00:00.000Z",
  ...over,
});

const showing = (over: Record<string, unknown> = {}) => {
  saleQuery.mockReturnValue({
    data: { data: { sale: sale(over) } },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
};

beforeEach(() => {
  saleQuery.mockReset();
});

describe("SaleDetail, once the load has been weighed in", () => {
  it("shows the agreed figure, the settled figure and the gap", () => {
    showing();
    render(<SaleDetail id="sale-1" />);

    expect(screen.getByText("Agreed total")).toBeInTheDocument();
    expect(screen.getByText("GH₵ 12,000.00")).toBeInTheDocument();
    expect(screen.getByText("Settled total")).toBeInTheDocument();
    // Twice: the settled total, and the payments that have covered it.
    expect(screen.getAllByText("GH₵ 11,760.00")).toHaveLength(2);
    expect(screen.getByText(/Short by/i)).toBeInTheDocument();
    expect(screen.getByText("GH₵ 240.00")).toBeInTheDocument();
  });

  it("calls the sale paid in full, though the agreed price says otherwise", () => {
    // The API's balanceGhs still says 240 is owed. It is not: the buyer paid
    // for everything that actually arrived.
    showing();
    render(<SaleDetail id="sale-1" />);

    expect(screen.getByText("Paid in full")).toBeInTheDocument();
  });

  it("shows the agreed figure alone while nothing has been weighed", () => {
    showing({ settledTotalGhs: null });
    render(<SaleDetail id="sale-1" />);

    expect(screen.queryByText("Settled total")).not.toBeInTheDocument();
    // 12,000 agreed less 11,760 paid: still a debtor, and the balance says so.
    expect(screen.getByText("GH₵ 240.00")).toBeInTheDocument();
    expect(screen.queryByText("Paid in full")).not.toBeInTheDocument();
  });

  it("does not read a settled zero as an unweighed load", () => {
    // A delivery refused outright is settled at nothing, and nothing is owed.
    showing({ paidGhs: 0, settledTotalGhs: 0 });
    render(<SaleDetail id="sale-1" />);

    expect(screen.getByText("Settled total")).toBeInTheDocument();
    expect(screen.getByText("Paid in full")).toBeInTheDocument();
  });
});

describe("SaleInvoice", () => {
  it("bills against the settled figure and still prints the agreement", () => {
    showing();
    render(<SaleInvoice id="sale-1" />);

    expect(screen.getByText("Agreed total")).toBeInTheDocument();
    expect(screen.getByText("GH₵ 12,000.00")).toBeInTheDocument();
    expect(screen.getByText(/Settled on arrival/i)).toBeInTheDocument();
    // Paid to the settled figure, so this is a receipt and not a demand.
    expect(screen.getAllByText(/RECEIPT|Receipt/).length).toBeGreaterThan(0);
    expect(screen.getByText("Paid in full")).toBeInTheDocument();
  });

  it("is still an invoice while the agreed price is unpaid and unweighed", () => {
    showing({ settledTotalGhs: null });
    render(<SaleInvoice id="sale-1" />);

    expect(screen.queryByText(/Settled on arrival/i)).not.toBeInTheDocument();
    expect(screen.getByText("Balance due")).toBeInTheDocument();
    expect(screen.getByText("GH₵ 240.00")).toBeInTheDocument();
  });
});
