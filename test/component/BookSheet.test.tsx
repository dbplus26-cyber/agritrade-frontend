// test/component/BookSheet.test.tsx
//
// The book loads as it is read: each page of rows joins the sheet when the
// reader nears its end. What this file pins:
//
//   * the pages read as ONE sheet, and the count says how far it has loaded;
//   * nearing the end asks for the next page, and there is a button that does
//     the same for a keyboard or a browser that reports no scrolling;
//   * nothing is asked for while a page is already on its way, or once the
//     book is all there;
//   * a page that fails to arrive keeps the rows already shown and offers a
//     retry, rather than replacing the sheet with an error.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BookSheet } from "@/components/admin/reports/purchase-book";
import type {
  IPurchaseBookResponse,
  IPurchaseBookRow,
} from "@/types/report.types";

const row = (n: number): IPurchaseBookRow => ({
  advanceGhs: null,
  bags: 10,
  balanceBags: 10,
  balanceCashGhs: -100 * n,
  balanceKg: 1000,
  date: "2026-03-01T00:00:00.000Z",
  dispatchedBags: 0,
  dispatchedKg: 0,
  documentId: `doc-${String(n)}`,
  fmDeductionKg: 0,
  fmDeductionPct: null,
  fmPercent: null,
  kind: "PURCHASE",
  particulars: `SOYA PURCHASED FROM FARMER ${String(n)}`,
  payableGhs: 100,
  priceGhs: 1,
  reference: `PUR-2026-${String(n).padStart(5, "0")}`,
  weightKg: 1000,
});

const page = (n: number, rows: number[]): IPurchaseBookResponse => ({
  data: {
    commodity: {
      fmStandardPct: 3,
      fmTolerancePct: 3.5,
      id: "c1",
      name: "Soya",
    },
    party: null,
    rows: rows.map(row),
    side: "PURCHASE",
    totals: {
      advanceGhs: 0,
      avgPriceGhs: 1,
      bags: 50,
      balanceBags: 50,
      balanceCashGhs: -500,
      balanceKg: 5000,
      dispatchedBags: 0,
      dispatchedKg: 0,
      fmDeductionKg: 0,
      payableGhs: 500,
      weightKg: 5000,
    },
    year: 2026,
  },
  message: "Purchase book",
  meta: { limit: 2, page: n, total: 5, totalPages: 3 },
});

// jsdom has no IntersectionObserver; this one lets a test say "the end of
// the sheet has come into view".
let reachEnd: () => void = () => undefined;
class Observer {
  constructor(callback: IntersectionObserverCallback) {
    reachEnd = () => {
      callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    };
  }
  disconnect() {
    return undefined;
  }
  observe() {
    return undefined;
  }
}

describe("BookSheet", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", Observer);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the loaded pages as one sheet and says how far it has loaded", () => {
    render(
      <BookSheet
        failed={false}
        hasMore
        loadingMore={false}
        onMore={vi.fn()}
        pages={[page(1, [1, 2]), page(2, [3, 4])]}
      />,
    );

    expect(screen.getByText(/FARMER 1/)).toBeInTheDocument();
    expect(screen.getByText(/FARMER 4/)).toBeInTheDocument();
    expect(screen.getByText(/Rows 1 to 4 of 5/)).toBeInTheDocument();
  });

  it("asks for the next page when the end of the sheet nears", () => {
    const onMore = vi.fn();
    render(
      <BookSheet
        failed={false}
        hasMore
        loadingMore={false}
        onMore={onMore}
        pages={[page(1, [1, 2])]}
      />,
    );

    act(() => {
      reachEnd();
    });

    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("has a button that loads the next page", async () => {
    const onMore = vi.fn();
    render(
      <BookSheet
        failed={false}
        hasMore
        loadingMore={false}
        onMore={onMore}
        pages={[page(1, [1, 2])]}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "Load more rows" }),
    );

    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it("asks for nothing while a page is on its way", () => {
    const onMore = vi.fn();
    render(
      <BookSheet
        failed={false}
        hasMore
        loadingMore
        onMore={onMore}
        pages={[page(1, [1, 2])]}
      />,
    );

    act(() => {
      reachEnd();
    });

    expect(onMore).not.toHaveBeenCalled();
  });

  it("stops at the end of the book", () => {
    const onMore = vi.fn();
    render(
      <BookSheet
        failed={false}
        hasMore={false}
        loadingMore={false}
        onMore={onMore}
        pages={[page(1, [1, 2]), page(2, [3, 4]), page(3, [5])]}
      />,
    );

    act(() => {
      reachEnd();
    });

    expect(onMore).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Load more rows" })).toBeNull();
    expect(screen.getByText(/All 5 rows/)).toBeInTheDocument();
  });

  it("keeps the rows and offers a retry when a page fails to arrive", async () => {
    const onMore = vi.fn();
    render(
      <BookSheet
        failed
        hasMore
        loadingMore={false}
        onMore={onMore}
        pages={[page(1, [1, 2])]}
      />,
    );

    // A failed page is not asked for again just because the end is in view.
    act(() => {
      reachEnd();
    });
    expect(onMore).not.toHaveBeenCalled();

    expect(screen.getByText(/FARMER 1/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onMore).toHaveBeenCalledTimes(1);
  });
});
