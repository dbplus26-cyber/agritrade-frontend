"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type RowSelectionState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DataTablePagination,
  PAGE_SIZE_OPTIONS,
} from "@/components/ui/DataTablePagination";
import { cn } from "@/lib/utils";

/** Per-column console styling carried on TanStack column meta. */
export interface ConsoleColumnMeta {
  /** Applied to both th and td (alignment, mono, responsive hiding). */
  className?: string;
  /** Applied to th only. */
  headerClassName?: string;
}

declare module "@tanstack/react-table" {
  // The standard TanStack meta-augmentation shape — params/emptiness required.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface ColumnMeta<TData, TValue> extends ConsoleColumnMeta {}
}

/**
 * The console data table (dms-frontend's TanStack + shadcn Table pattern in
 * the DB Plus skin). Screens own their search inputs and filters (pass the
 * query via `globalFilter`); the table owns sorting, selection and paging:
 *
 * - `enableSelection` injects the checkbox column; `renderBulkActions`
 *   receives the selected rows (and a clear function) and is rendered as a
 *   toolbar row while anything is selected — the home of "Delete selected".
 * - Pagination is the shared DataTablePagination footer with a rows-per-page
 *   selector, and — dms rule — it only appears once there are more rows than
 *   the smallest page size. Two items never get a pager.
 */
export interface ServerPagination {
  totalCount: number;
  /** 1-based current page. */
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ConsoleDataTable<TData>({
  columns,
  data,
  itemNoun,
  pageSize: initialPageSize = 10,
  globalFilter = "",
  rowHref,
  rowClassName,
  emptyState,
  className,
  enableSelection = false,
  renderBulkActions,
  serverPagination,
  isFetching = false,
  isFiltered = false,
}: {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  /** Plural noun for the footer, e.g. "purchases". */
  itemNoun: string;
  pageSize?: number;
  globalFilter?: string;
  /** Row click / keyboard navigation target. */
  rowHref?: (row: TData) => string | undefined;
  /**
   * Extra classes for a TABLE ROW. Deliberately NOT applied to the mobile card:
   * every caller passes a fixed height here (`h-12`, `h-14`) because that is
   * what a `<tr>` wants, and clamping a card holding five stacked label/value
   * rows to 48px made them overlap each other — the cramped, unreadable mobile
   * list this fixes. The card owns its own vertical rhythm.
   */
  rowClassName?: (row: TData) => string | undefined;
  emptyState?: React.ReactNode;
  className?: string;
  /** Adds the select-all / per-row checkboxes. */
  enableSelection?: boolean;
  /** Toolbar shown while rows are selected (bulk delete etc.). */
  renderBulkActions?: (
    selected: TData[],
    clearSelection: () => void,
  ) => React.ReactNode;
  /**
   * Server mode (dms pattern): searching/filtering/paging happen backend-side;
   * `data` is exactly the current page and the footer drives these callbacks.
   */
  serverPagination?: ServerPagination;
  /** True while a refetch is in flight — the current rows stay visible,
   * slightly dimmed, and snap to the new list when it lands. */
  isFetching?: boolean;
  /**
   * True when a search or filter is narrowing the list.
   *
   * It changes what an empty table MEANS, and therefore what it should look
   * like. Nothing on file at all is a register waiting to be started: it gets
   * the empty state ALONE, with no column headings standing over nothing and
   * no pager for a single absent page. Nothing matching a filter is a
   * different message entirely - the headings stay, because the columns are
   * what the reader just filtered on.
   *
   * Without this the shell always drew the full table furniture around an
   * empty body, which is what made a register with no rows still scroll
   * sideways: the header row, not the content, was setting the width.
   */
  isFiltered?: boolean;
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [pageSize, setPageSize] = useState(initialPageSize);

  const allColumns = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableSelection) return columns;
    const select: ColumnDef<TData, unknown> = {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all rows on this page"
          className="cursor-pointer border-soil/35"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
          className="cursor-pointer border-soil/35"
        />
      ),
      enableSorting: false,
      meta: { className: "w-9 pr-0" },
    };
    return [select, ...columns];
  }, [columns, enableSelection]);

  const manual = Boolean(serverPagination);
  const table = useReactTable({
    data,
    columns: allColumns,
    state: { sorting, globalFilter: manual ? "" : globalFilter, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: enableSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    ...(manual ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    manualPagination: manual,
    manualFiltering: manual,
    globalFilterFn: "includesString",
    initialState: { pagination: { pageSize: initialPageSize } },
  });

  // Keep TanStack's page size in step with the footer's selector (client mode).
  useEffect(() => {
    if (!manual) table.setPageSize(pageSize);
  }, [pageSize, table, manual]);

  const rows = table.getRowModel().rows;
  // Column-id -> header label, for the mobile card variant (below).
  const leafHeaders = table.getHeaderGroups().at(-1)?.headers ?? [];
  const headerLabel = new Map(
    leafHeaders.map((h) => [
      h.column.id,
      h.isPlaceholder
        ? null
        : flexRender(h.column.columnDef.header, h.getContext()),
    ]),
  );
  const total = serverPagination
    ? serverPagination.totalCount
    : table.getFilteredRowModel().rows.length;
  const { pageIndex } = table.getState().pagination;
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((r) => r.original);

  // dms rule: no pager for a page that couldn't possibly need one.
  const showPagination = total > Math.min(...PAGE_SIZE_OPTIONS);

  // A register with nothing in it and nothing filtering it shows the empty
  // state and NOTHING else - no headings over an absent body, no pager, no
  // scroll container. Withheld while fetching so the first paint of a table
  // that does have rows isn't a flash of "nothing here".
  if (!isFetching && rows.length === 0 && !isFiltered) {
    return (
      <div className={cn("@container/table min-w-0", className)}>
        {emptyState ?? (
          <div className="px-4 py-12 text-center text-[13px] text-soil">
            Nothing here yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("@container/table min-w-0", className)}>
      {enableSelection && selectedRows.length > 0 && renderBulkActions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-soil/25 bg-console/5 px-4 py-2">
          <span className="text-[12.5px] font-semibold text-soil">
            {selectedRows.length} selected
          </span>
          <div className="flex items-center gap-2">
            {renderBulkActions(selectedRows, () => setRowSelection({}))}
          </div>
        </div>
      ) : null}

      {/* Narrow CONTENT (not narrow viewport): each row becomes a stacked
          label/value card, so the table never scrolls sideways and no column is
          hidden off-screen.

          Keyed to this component's OWN container width, not the viewport. A
          768px tablet has only ~512px of content once the 16rem sidebar is
          open, so a viewport `md:` would render the full table into half the
          room it was designed for — the cramped, overflowing layout this
          replaces. Measuring the container instead means the switch is right
          wherever the table is placed, and there is exactly ONE rule setting
          `display` per view (a viewport fallback alongside would race it,
          with whichever lands later in the stylesheet silently winning). */}
      <div
        className={cn(
          "flex flex-col gap-2 py-2 transition-opacity @2xl/table:hidden",
          isFetching && "pointer-events-none opacity-60",
        )}
        aria-busy={isFetching || undefined}
      >
        {rows.length === 0
          ? (emptyState ?? (
              <div className="px-4 py-12 text-center text-[13px] text-soil">
                Nothing here yet.
              </div>
            ))
          : rows.map((row) => {
              const href = rowHref?.(row.original);
              const selectCell = row
                .getVisibleCells()
                .find((c) => c.column.id === "select");
              const visible = row
                .getVisibleCells()
                .filter((c) => c.column.id !== "select");
              const isData = (c: (typeof visible)[number]) =>
                Boolean((c.column.columnDef as { accessorFn?: unknown }).accessorFn);
              // A table puts row actions wherever the column order says; a CARD
              // reads top to bottom, so they belong at the foot of it. Split
              // rather than relying on call sites to declare actions last.
              const cells = visible.filter(isData);
              const actionCells = visible.filter((c) => !isData(c));
              return (
                <div
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={href ? () => router.push(href) : undefined}
                  className={cn(
                    // Squared with a 1.5px border to match AdminCard, the
                    // surface every other console screen is filed on.
                    "rounded-none border-[1.5px] border-soil/30 bg-paper px-3 py-2 data-[state=selected]:border-console/40 data-[state=selected]:bg-console/5",
                    href && "cursor-pointer hover:border-soil/40",
                  )}
                >
                  {selectCell ? (
                    <div className="mb-1.5 flex justify-end">
                      {flexRender(
                        selectCell.column.columnDef.cell,
                        selectCell.getContext(),
                      )}
                    </div>
                  ) : null}
                  {cells.map((cell) => {
                    const label = headerLabel.get(cell.column.id);
                    // Drop rows with nothing in them: a stack of
                    // "DESCRIPTION —" placeholders is pure noise on a phone,
                    // and reserved slots that never fill are exactly the
                    // "unintentional negative space" to avoid.
                    const raw = cell.getValue();
                    if (raw === null || raw === undefined || raw === "") {
                      return null;
                    }
                    return (
                      <div
                        key={cell.id}
                        className="flex items-start justify-between gap-3 border-b border-soil/10 py-1.5 text-[13px] last:border-b-0"
                      >
                        {label ? (
                          <span className="flex-none pt-px text-[11px] font-semibold tracking-[0.05em] text-soil/70 uppercase">
                            {label}
                          </span>
                        ) : null}
                        {/* BLOCK, not the default inline. Cell content is
                            routinely a block element with a max-width; inside
                            an inline parent its containing block is resolved
                            somewhere further up, so the clamp missed and wide
                            content ran straight off the side of the card. */}
                        <span
                          className={cn(
                            "block min-w-0 [overflow-wrap:anywhere] text-ink",
                            label ? "text-right" : "w-full",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </span>
                      </div>
                    );
                  })}
                  {actionCells.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5 border-t border-soil/10 pt-1.5">
                      {actionCells.map((cell) => (
                        <span key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
      </div>

      {/* Wide container: the real table, horizontally scrollable only as a
          last resort on genuinely wide content. */}
      <div
        className={cn(
          "hidden overflow-x-auto transition-opacity @2xl/table:block",
          isFetching && "pointer-events-none opacity-60",
        )}
        aria-busy={isFetching || undefined}
      >
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="border-soil/25 hover:bg-transparent"
            >
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const sortable = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-auto px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-soil/70",
                      sortable && "cursor-pointer select-none",
                      meta?.className,
                      meta?.headerClassName,
                    )}
                    onClick={
                      sortable
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                    {dir === "asc" ? " ↑" : dir === "desc" ? " ↓" : null}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={allColumns.length} className="p-0">
                {emptyState ?? (
                  <div className="px-4 py-12 text-center text-[13px] text-soil">
                    Nothing here yet.
                  </div>
                )}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row) => {
              const href = rowHref?.(row.original);
              return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() ? "selected" : undefined}
                  onClick={href ? () => router.push(href) : undefined}
                  className={cn(
                    "border-soil/15 data-[state=selected]:bg-console/5",
                    href && "cursor-pointer hover:bg-surface-alt/70",
                    rowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        // Two lines is the ceiling for ANY cell. A row is a
                        // scan target, not a paragraph: let one cell run to
                        // four lines and every row beside it inherits the
                        // height, and the table stops being scannable. Cells
                        // that want a single line clamp themselves; this is
                        // the backstop for the ones that do not.
                        "px-3 py-3 text-[13.5px] text-ink [&_p]:line-clamp-2",
                        cell.column.columnDef.meta?.className,
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </div>

      {showPagination ? (
        <DataTablePagination
          totalCount={total}
          page={serverPagination ? serverPagination.page : pageIndex + 1}
          pageSize={serverPagination ? serverPagination.pageSize : pageSize}
          selectedCount={selectedRows.length}
          itemNoun={itemNoun}
          onPageChange={(p) =>
            serverPagination
              ? serverPagination.onPageChange(p)
              : table.setPageIndex(p - 1)
          }
          onPageSizeChange={(size) =>
            serverPagination
              ? serverPagination.onPageSizeChange(size)
              : setPageSize(size)
          }
        />
      ) : total > 0 ? (
        <div className="border-t border-soil/25 px-4 py-2.5 text-[12.5px] text-soil">
          {total} {itemNoun}
        </div>
      ) : null}
    </div>
  );
}
