import { afterEach, describe, expect, it, vi } from "vitest";
import {
  collectExportRows,
  downloadCsv,
  toCsv,
  type CsvColumn,
} from "@/lib/csv-export";

type Row = {
  name: string;
  amountGhs: number | null;
  supplier: { name: string } | null;
};
const columns: CsvColumn<Row>[] = [
  { header: "Name", path: "name" },
  { header: "Amount (GHS)", path: "amountGhs", money: true },
  { header: "Supplier", path: "supplier.name" },
];
const page = (data: unknown[], current: number, total: number) => ({
  data,
  meta: { page: current, limit: 2, total, totalPages: Math.ceil(total / 2) },
});

describe("CSV exports", () => {
  it("quotes text, preserves precision and signed numbers, and leaves redacted values blank", () => {
    expect(
      toCsv(columns, [
        {
          name: 'Maize, "white"\nGrade A',
          amountGhs: -1234.56,
          supplier: { name: "Ési" },
        },
        { name: "Rice", amountGhs: null, supplier: null },
      ]),
    ).toBe(
      '\uFEFF"Name","Amount (GHS)","Supplier"\r\n"Maize, ""white""\nGrade A","-1234.56","Ési"\r\n"Rice","",""',
    );
  });
  it("neutralizes spreadsheet formulas even behind whitespace and control characters", () => {
    for (const name of [
      "=1+1",
      "+233555555",
      "-1+2",
      "@SUM(A1)",
      "\t=1",
      "\r=1",
      "  =1",
      "\u0000=1",
    ]) {
      expect(toCsv([{ header: "Name", path: "name" }], [{ name }])).toContain(
        `"'${name}"`,
      );
    }
  });
  it("omits hidden financial columns and exports only explicitly listed fields", () => {
    const rows = [
      { name: "Rice", amountGhs: 42, supplier: null, secret: "do not export" },
    ];
    expect(toCsv(columns, rows, false)).toBe(
      '\uFEFF"Name","Supplier"\r\n"Rice",""',
    );
  });
  it("supports header-only empty exports", () => {
    expect(toCsv(columns, [])).toBe('\uFEFF"Name","Amount (GHS)","Supplier"');
  });
  it("collects every matching page starting with page one", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([{ id: "a" }, { id: "b" }], 1, 3))
      .mockResolvedValueOnce(page([{ id: "c" }], 2, 3));
    expect(await collectExportRows(load, new AbortController().signal)).toEqual(
      [{ id: "a" }, { id: "b" }, { id: "c" }],
    );
    expect(load.mock.calls.map(([p]) => p)).toEqual([1, 2]);
  });
  it("rejects a failed later page instead of returning a partial export", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce(page([{ id: "a" }, { id: "b" }], 1, 3))
      .mockRejectedValueOnce(new Error("Forbidden"));
    await expect(
      collectExportRows(load, new AbortController().signal),
    ).rejects.toThrow("Forbidden");
  });
  it("rejects changing totals, duplicate rows and unexpectedly short pages", async () => {
    for (const second of [
      page([{ id: "c" }], 2, 4),
      page([{ id: "a" }], 2, 3),
      page([], 2, 3),
    ]) {
      const load = vi
        .fn()
        .mockResolvedValueOnce(page([{ id: "a" }, { id: "b" }], 1, 3))
        .mockResolvedValueOnce(second);
      await expect(
        collectExportRows(load, new AbortController().signal),
      ).rejects.toThrow(/changed|incomplete/i);
    }
  });
  it("stops before the next request on cancellation", async () => {
    const controller = new AbortController();
    const load = vi.fn(async () => {
      controller.abort();
      return page([{ id: "a" }, { id: "b" }], 1, 3);
    });
    await expect(collectExportRows(load, controller.signal)).rejects.toThrow(
      /cancel/i,
    );
    expect(load).toHaveBeenCalledTimes(1);
  });
  it("bounds the workload and rejects malformed pagination", async () => {
    for (const result of [
      page([], 1, 50001),
      { data: [], meta: { total: 3 } },
      { data: {} },
    ]) {
      await expect(
        collectExportRows(
          vi.fn().mockResolvedValue(result),
          new AbortController().signal,
        ),
      ).rejects.toThrow();
    }
  });
});

describe("CSV download files", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
  it("creates a dated CSV file and releases the download URL", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-27T12:00:00Z"));
    const createObjectURL = vi.fn<(blob: Blob) => string>(
      () => "blob:csv-test",
    );
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    let filename = "";
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        filename = this.download;
        expect(this.isConnected).toBe(true);
        expect(this.getAttribute("href")).toBe("blob:csv-test");
      });
    downloadCsv("stock/balances", "csv contents");
    expect(filename).toBe("stock-balances-2026-09-27.csv");
    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob);
    expect((createObjectURL.mock.calls[0][0] as Blob).type).toBe(
      "text/csv;charset=utf-8",
    );
    expect(document.querySelector("a[download]")).toBeNull();
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:csv-test");
  });
});
