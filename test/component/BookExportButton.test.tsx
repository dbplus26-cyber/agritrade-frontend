// test/component/BookExportButton.test.tsx
//
// Exporting a book asks the server first, because only the server knows how
// long the book is. What this file pins:
//
//   * nothing is asked for until the export is confirmed;
//   * a short book is downloaded at once;
//   * a long one is NOT downloaded: it is being prepared in the background,
//     and the screen says where it will turn up.
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BookExportButton } from "@/components/admin/reports/book-export-button";

const mocks = vi.hoisted(() => ({
  ask: vi.fn(),
  info: vi.fn(),
  start: vi.fn(),
}));
vi.mock("@/lib/start-download", () => ({ startDownload: mocks.start }));
vi.mock("@/lib/notify", () => ({
  notify: { error: vi.fn(), info: mocks.info, success: vi.fn() },
}));
vi.mock("@/redux/reports/reports-api", () => ({
  useRequestBookExportMutation: () => [mocks.ask, { isLoading: false }],
}));

const KEY = {
  commodityId: "c0ffee00-1111-4111-8111-111111111111",
  side: "PURCHASE" as const,
  year: 2026,
};
const HREF = "https://api.test/exports/purchase-book.xlsx?year=2026";
const button = (
  <BookExportButton book={KEY} href={HREF} what="The purchase book" />
);
const answer = (queued: unknown) =>
  mocks.ask.mockReturnValue({
    unwrap: () => Promise.resolve({ data: { export: queued }, message: "" }),
  });

beforeEach(() => vi.clearAllMocks());

it("asks for nothing until the export is confirmed", async () => {
  answer(null);
  render(button);
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  expect(await screen.findByText("Export to Excel?")).toBeInTheDocument();
  expect(mocks.ask).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByText("Export to Excel?")).not.toBeInTheDocument(),
  );
  expect(mocks.ask).not.toHaveBeenCalled();
  expect(mocks.start).not.toHaveBeenCalled();
});

it("downloads a short book at once", async () => {
  answer(null);
  render(button);
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Export" }));
  await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(HREF));
  expect(mocks.ask).toHaveBeenCalledWith(KEY);
});

it("says a long book is being prepared, and downloads nothing", async () => {
  answer({ id: "e1", totalRows: 300_000 });
  render(button);
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Export" }));
  expect(
    await screen.findByText(/300,000 rows.*being prepared/),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Open exports" })).toHaveAttribute(
    "href",
    "/admin/reports/exports",
  );
  expect(mocks.start).not.toHaveBeenCalled();
});
