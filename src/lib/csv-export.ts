export type CsvCell = string | number | boolean | null | undefined;

type CsvPath<T> = {
  [K in keyof T & string]: NonNullable<T[K]> extends CsvCell
    ? K
    : NonNullable<T[K]> extends readonly unknown[]
      ? never
      : NonNullable<T[K]> extends object
        ? `${K}.${CsvPath<NonNullable<T[K]>>}`
        : never;
}[keyof T & string];

export interface CsvColumn<T> {
  header: string;
  path: CsvPath<T>;
  money?: boolean;
}

export interface CsvSource {
  url: string;
  params?: object;
}

export interface CsvExportConfig<T> {
  filename: string;
  columns: readonly CsvColumn<T>[];
  /** Omit only when the complete, filtered dataset is already loaded. */
  source?: CsvSource;
}

/** Explicit, type-checked fields keep attachments and internal state out of exports. */
export function csvColumns<T>(
  entries: readonly (readonly [string, CsvPath<T>, boolean?])[],
): CsvColumn<T>[] {
  return entries.map(([header, path, money]) => ({
    header,
    path,
    money: money ?? /Ghs$/.test(path),
  }));
}

function readCell(row: unknown, path: string): CsvCell {
  let value: unknown = row;
  for (const key of path.split(".")) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.hasOwn(value, key)
    )
      return null;
    value = (value as Record<string, unknown>)[key];
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return typeof value === "string" || typeof value === "boolean" ? value : null;
}

function escapeCell(cell: CsvCell): string {
  const raw = cell == null ? "" : String(cell);
  // CSV quoting alone does not prevent Excel/Sheets from evaluating a formula.
  const value =
    typeof cell === "string" &&
    (/^[\s\u0000-\u001f]*[=+\-@]/.test(raw) || /^[\t\r\n]/.test(raw))
      ? `'${raw}`
      : raw;
  return `"${value.replaceAll('"', '""')}"`;
}

export function toCsv<T>(
  columns: readonly CsvColumn<T>[],
  rows: readonly T[],
  showMoney = true,
): string {
  const visible = columns.filter((column) => showMoney || !column.money);
  const lines = [
    visible.map((column) => column.header),
    ...rows.map((row) => visible.map((column) => readCell(row, column.path))),
  ];
  return `\uFEFF${lines.map((line) => line.map(escapeCell).join(",")).join("\r\n")}`;
}

const MAX_EXPORT_ROWS = 50_000;
const incomplete = () =>
  new Error(
    "The register changed or returned incomplete data. Please retry the export.",
  );

/** Read bounded pages through the same authenticated list endpoints as the table. */
export async function collectExportRows(
  load: (page: number) => Promise<unknown>,
  signal: AbortSignal,
): Promise<unknown[]> {
  const rows: unknown[] = [];
  const ids = new Set<string>();
  let expectedTotal: number | undefined;
  let expectedLimit: number | undefined;
  for (let page = 1; ; page++) {
    if (signal.aborted) throw new Error("Export cancelled.");
    const response = await load(page);
    if (signal.aborted) throw new Error("Export cancelled.");
    if (!response || typeof response !== "object") throw incomplete();
    const { data, meta } = response as {
      data?: unknown;
      meta?: { total: number; page: number; limit: number; totalPages: number };
    };
    if (
      !Array.isArray(data) ||
      !meta ||
      !Number.isInteger(meta.total) ||
      meta.total < 0 ||
      !Number.isInteger(meta.limit) ||
      meta.limit < 1 ||
      meta.page !== page
    )
      throw incomplete();
    if (meta.total > MAX_EXPORT_ROWS)
      throw new Error(
        "This export exceeds 50,000 rows. Narrow the date range or filters and try again.",
      );
    expectedTotal ??= meta.total;
    expectedLimit ??= meta.limit;
    if (
      meta.total !== expectedTotal ||
      meta.limit !== expectedLimit ||
      data.length !==
        Math.min(meta.limit, Math.max(0, meta.total - rows.length))
    )
      throw incomplete();
    for (const row of data) {
      if (!row || typeof row !== "object") throw incomplete();
      const id =
        "id" in row ? row.id : "userId" in row ? row.userId : undefined;
      if (typeof id === "string") {
        if (ids.has(id)) throw incomplete();
        ids.add(id);
      }
      rows.push(row);
    }
    if (rows.length === expectedTotal) return rows;
  }
}

export function downloadCsv(filename: string, csv: string): void {
  const safeName =
    filename.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 100) || "export";
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeName}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    // Give the browser time to start reading the download before releasing it.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
