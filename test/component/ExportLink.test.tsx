import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExportLink } from "@/components/admin/export-link";

const mocks = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("@/lib/start-download", () => ({ startDownload: mocks.start }));

const HREF = "https://api.test/exports/purchase-book.xlsx?year=2026";
const book = (
  <ExportLink format="Excel" href={HREF} what="The purchase book">
    Export Excel
  </ExportLink>
);

beforeEach(() => vi.clearAllMocks());

it("downloads the file only once the export is confirmed", async () => {
  render(book);
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  expect(await screen.findByText("Export to Excel?")).toBeInTheDocument();
  expect(mocks.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
  await waitFor(() => expect(mocks.start).toHaveBeenCalledWith(HREF));
});

it("downloads nothing when the export is cancelled", async () => {
  render(book);
  fireEvent.click(screen.getByRole("button", { name: "Export Excel" }));
  fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByText("Export to Excel?")).not.toBeInTheDocument(),
  );
  expect(mocks.start).not.toHaveBeenCalled();
});
