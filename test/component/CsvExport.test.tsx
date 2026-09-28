import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import type { CsvColumn } from "@/lib/csv-export";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  fetchRows: vi.fn(),
  reset: vi.fn(),
  error: vi.fn(),
  money: true,
}));
vi.mock("@/lib/csv-export", async (original) => ({
  ...(await original<typeof import("@/lib/csv-export")>()),
  downloadCsv: mocks.download,
}));
vi.mock("@/hooks/use-money-visibility", () => ({
  useMoneyVisibility: () => mocks.money,
}));
vi.mock("@/redux/exports/exports-api", () => ({
  useGetCsvRowsMutation: () => [mocks.fetchRows, { reset: mocks.reset }],
}));
vi.mock("@/lib/notify", () => ({ notify: { error: mocks.error } }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

type Row = { id: string; name: string; amountGhs: number };
const columns: CsvColumn<Row>[] = [
  { header: "Name", path: "name" },
  { header: "Amount (GHS)", path: "amountGhs", money: true },
];
const config = {
  filename: "purchases",
  columns,
  source: {
    url: "admin/purchases",
    params: { search: "Maize", page: 4, status: "RECEIVED" },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.money = true;
});
afterEach(() => vi.restoreAllMocks());

describe("CSV download controls", () => {
  it("exports all locally filtered rows across pages and excludes hidden money", async () => {
    mocks.money = false;
    const rows = Array.from({ length: 15 }, (_, i) => ({
      id: String(i),
      name: `Maize ${i}`,
      amountGhs: 123,
    }));
    render(
      <ConsoleDataTable
        columns={[{ accessorKey: "name", header: "Name" }]}
        data={[...rows, { id: "rice", name: "Rice", amountGhs: 42 }]}
        itemNoun="purchases"
        globalFilter="Maize"
        csvExport={{ filename: "purchases", columns }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
    const csv = mocks.download.mock.calls[0][1];
    expect(csv.split("\r\n")).toHaveLength(16);
    expect(csv).toContain('"Maize 14"');
    expect(csv).not.toContain("Rice");
    expect(csv).not.toContain("123");
    expect(csv).not.toContain("Amount");
    expect(mocks.fetchRows).not.toHaveBeenCalled();
  });
  it("passes the current source filters and downloads the complete fetched dataset", async () => {
    mocks.fetchRows.mockReturnValue({
      unwrap: async () => [
        { id: "off-page", name: "Maize elsewhere", amountGhs: 12.75 },
      ],
      abort: vi.fn(),
    });
    render(<CsvExportButton config={config} rows={[]} />);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(mocks.download).toHaveBeenCalledOnce());
    expect(mocks.fetchRows).toHaveBeenCalledWith(config.source);
    expect(mocks.download.mock.calls[0][1]).toContain(
      '"Maize elsewhere","12.75"',
    );
  });
  it("shows failures without downloading partial data and allows a retry", async () => {
    mocks.fetchRows.mockReturnValue({
      unwrap: async () => {
        throw { status: 403 };
      },
      abort: vi.fn(),
    });
    render(<CsvExportButton config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.download).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled();
  });
  it("prevents duplicate downloads and suppresses late results after cancellation", async () => {
    let resolve!: (rows: Row[]) => void;
    const abort = vi.fn();
    mocks.fetchRows.mockReturnValue({
      unwrap: () =>
        new Promise<Row[]>((done) => {
          resolve = done;
        }),
      abort,
    });
    render(<CsvExportButton config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    expect(screen.getByRole("button", { name: /Exporting/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel export" }));
    expect(abort).toHaveBeenCalledOnce();
    resolve([{ id: "1", name: "Maize", amountGhs: 5 }]);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Export CSV" })).toBeEnabled(),
    );
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("aborts a running export when its screen unmounts", () => {
    const abort = vi.fn();
    mocks.fetchRows.mockReturnValue({
      unwrap: () => new Promise(() => {}),
      abort,
    });
    const view = render(<CsvExportButton config={config} />);
    fireEvent.click(screen.getByRole("button", { name: "Export CSV" }));
    view.unmount();
    expect(abort).toHaveBeenCalledOnce();
  });
});
