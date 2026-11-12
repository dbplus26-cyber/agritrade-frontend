// test/component/BookExports.test.tsx
//
// The Exports page is where a long book's file is collected. What this file
// pins:
//
//   * a finished export offers each of its files, and a download goes through
//     the API (which checks whose export it is), never to a storage address;
//   * an export still being prepared shows how far it has got, and the page
//     keeps asking until it is done, then stops;
//   * a failed one says what to do next.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { BookExports } from "@/components/admin/reports/book-exports";
import type { IDataExport } from "@/types/report.types";

const mocks = vi.hoisted(() => ({
  list: [] as unknown[],
  query: vi.fn(),
  start: vi.fn(),
}));
vi.mock("@/lib/start-download", () => ({ startDownload: mocks.start }));
vi.mock("@/lib/env", () => ({ env: { SERVER_URI: "https://api.test" } }));
vi.mock("@/redux/reports/reports-api", () => ({
  useGetBookExportsQuery: (...args: unknown[]) => {
    mocks.query(...args);
    return {
      data: {
        data: mocks.list,
        meta: { limit: 20, page: 1, total: mocks.list.length, totalPages: 1 },
      },
      isError: false,
      isLoading: false,
    };
  },
}));

const item = (over: Partial<IDataExport>): IDataExport => ({
  completedAt: null,
  createdAt: "2026-11-12T10:00:00.000Z",
  error: null,
  expiresAt: null,
  files: [],
  id: "e1",
  rowCount: 0,
  status: "QUEUED",
  title: "Soya Purchase Book 2026",
  totalRows: 90_000,
  type: "PURCHASE_BOOK",
  ...over,
});

describe("BookExports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list = [];
  });

  it("offers each file of a finished export, through the API", () => {
    mocks.list = [
      item({
        completedAt: "2026-11-12T10:05:00.000Z",
        expiresAt: "2026-11-19T10:05:00.000Z",
        files: [
          { name: "Book (part 1 of 2).xlsx", part: 1, rows: 40_000 },
          { name: "Book (part 2 of 2).xlsx", part: 2, rows: 50_000 },
        ],
        rowCount: 90_000,
        status: "COMPLETED",
      }),
    ];
    render(<BookExports />);

    expect(screen.getByText("Soya Purchase Book 2026")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Download part 2 of 2/ }),
    );
    expect(mocks.start).toHaveBeenCalledWith(
      "https://api.test/api/v1/admin/reports/book-exports/e1/files/2",
    );
  });

  it("shows how far a build has got and keeps asking until it is done", () => {
    mocks.list = [item({ rowCount: 40_000, status: "PROCESSING" })];
    render(<BookExports />);

    expect(screen.getByText(/40,000 of 90,000 rows/)).toBeInTheDocument();
    expect(mocks.query).toHaveBeenLastCalledWith(
      { page: 1 },
      expect.objectContaining({ pollingInterval: 4000 }),
    );
    expect(screen.queryByRole("button", { name: /Download/ })).toBeNull();
  });

  it("stops asking once nothing is being prepared", () => {
    mocks.list = [item({ status: "COMPLETED" })];
    render(<BookExports />);

    expect(mocks.query).toHaveBeenLastCalledWith(
      { page: 1 },
      expect.objectContaining({ pollingInterval: 0 }),
    );
  });

  it("says what to do about an export that failed", () => {
    mocks.list = [item({ error: "storage refused", status: "FAILED" })];
    render(<BookExports />);

    expect(screen.getByText(/could not be prepared/i)).toBeInTheDocument();
    expect(screen.queryByText(/storage refused/)).toBeNull();
  });

  it("says so when there are none", () => {
    render(<BookExports />);
    expect(screen.getByText("No exports yet")).toBeInTheDocument();
  });
});
