// test/component/PurchaseCostsCard.test.tsx
//
// The section that answers the question the whole feature exists for: what has
// this load cost us, as against what the document says it was bought for.
// What is pinned here is what would be expensive to get wrong on a page
// somebody prices a sale from:
//
//   * the headline is the grain PLUS the costs taken into it, and the purchase
//     price is still on the card in full - it is what a supplier's invoice is
//     checked against, and replacing it would break a reconciliation;
//   * a cost of the month is listed and totalled SEPARATELY. Folding it into
//     the headline would charge the goods and the month's books for one cedi;
//   * each row says which treatment it got, because that is the fact nobody
//     can recover later;
//   * a voided voucher is still listed and stops counting;
//   * a voided PURCHASE offers no way to record another cost against it.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import { PurchaseCostsCard } from "@/components/admin/purchases/purchase-costs-card";
import type { IPurchaseCost } from "@/types/purchase.types";

const { useGetPurchaseCosts } = vi.hoisted(() => ({
  useGetPurchaseCosts: vi.fn(),
}));

vi.mock("@/redux/purchases/purchases-api", () => ({
  useGetPurchaseCostsQuery: useGetPurchaseCosts,
}));

vi.mock("@/redux/expense-categories/expense-categories-api", () => ({
  useGetExpenseCategoriesQuery: () => ({ data: { data: [] } }),
}));

// The dialog is its own screen with its own test file; stubbed so this one
// tests what the section says rather than what the form does.
vi.mock("@/components/admin/purchases/purchase-cost-form", () => ({
  PurchaseCostDialog: () => null,
}));

vi.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ has: () => true, known: true }),
}));

const cost = (over: Partial<IPurchaseCost>): IPurchaseCost =>
  ({
    amountGhs: 400,
    capitalisedAt: "2026-07-11T00:00:00.000Z",
    category: { id: "cat-haulage", name: "Haulage" },
    createdAt: "2026-07-11T00:00:00.000Z",
    description: null,
    id: "exp-1",
    incurredAt: "2026-07-11T00:00:00.000Z",
    shipment: null,
    transactionNo: "EXP-2026-00156",
    voidedAt: null,
    voidReason: null,
    ...over,
  }) as IPurchaseCost;

const withCosts = (expenses: IPurchaseCost[]) => {
  useGetPurchaseCosts.mockReturnValue({
    data: { data: { expenses }, message: "ok" },
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  });
};

const renderCard = (isVoided = false) =>
  render(
    <PurchaseCostsCard
      isVoided={isVoided}
      purchaseId="pur-1"
      totalGhs={3000}
    />,
  );

beforeEach(() => {
  useGetPurchaseCosts.mockReset();
});

describe("PurchaseCostsCard", () => {
  it("heads with the grain plus the costs taken into it", () => {
    withCosts([cost({})]);
    renderCard();

    expect(screen.getByText("GH₵ 3,400.00")).toBeInTheDocument();
    // The purchase price survives, stated as itself. Both it and the cost read
    // twice over - once in the breakdown, once on the row - which is the
    // point: the headline is not the only place a figure is recoverable.
    expect(screen.getAllByText("GH₵ 3,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GH₵ 400.00").length).toBeGreaterThan(0);
  });

  it("keeps a cost of the month out of the headline and says where it went", () => {
    withCosts([cost({ amountGhs: 120, capitalisedAt: null })]);
    renderCard();

    expect(screen.getAllByText("GH₵ 3,000.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("GH₵ 3,120.00")).not.toBeInTheDocument();
    expect(
      screen.getByText(/charged to this purchase but not to the goods/i),
    ).toBeInTheDocument();
  });

  it("says on every row which treatment the cost got", () => {
    withCosts([
      cost({}),
      cost({ amountGhs: 120, capitalisedAt: null, id: "exp-2" }),
    ]);
    renderCard();

    expect(screen.getByText("In the goods")).toBeInTheDocument();
    expect(screen.getByText("Cost of the month")).toBeInTheDocument();
  });

  it("still lists a voided voucher, and stops counting it", () => {
    withCosts([
      cost({}),
      cost({
        amountGhs: 500,
        id: "exp-2",
        transactionNo: "EXP-2026-00157",
        voidedAt: "2026-07-20T00:00:00.000Z",
      }),
    ]);
    renderCard();

    expect(screen.getByText("EXP-2026-00157")).toBeInTheDocument();
    expect(screen.getByText("Voided")).toBeInTheDocument();
    expect(screen.getByText("GH₵ 3,400.00")).toBeInTheDocument();
  });

  it("hides every figure when one of them was redacted", () => {
    withCosts([cost({}), cost({ amountGhs: null, id: "exp-2" })]);
    renderCard();

    // A total that skipped what it could not see would be a smaller, wrong
    // number wearing the same label.
    expect(screen.queryByText("GH₵ 3,400.00")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hidden").length).toBeGreaterThan(0);
  });

  it("invites the first cost when there are none", () => {
    withCosts([]);
    renderCard();

    expect(screen.getAllByText("GH₵ 3,000.00").length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Nothing has been recorded against this load yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Record a cost" }),
    ).toBeInTheDocument();
  });

  it("offers no way to charge a struck-out purchase, and says why", () => {
    withCosts([]);
    renderCard(true);

    expect(
      screen.queryByRole("button", { name: "Record a cost" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/no longer on the books/i),
    ).toBeInTheDocument();
  });
});
