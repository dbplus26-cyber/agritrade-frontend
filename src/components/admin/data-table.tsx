"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { HelpTip } from "@/components/admin/help-tip";
import { cn } from "@/lib/utils";

/**
 * A column heading that carries its own explanation.
 *
 * Half the console's headings are a single domain word - Basis, Float,
 * Outstanding, Variance, Lot - and a word that short can only be understood by
 * somebody who already knows it. Pass the sentence it stands for and the
 * heading grows a help icon.
 *
 * The icon is withheld from the narrow-container CARD view on purpose. Down
 * there the heading is repeated once per row, so an icon on each would put ten
 * of them down a phone screen and make the list unreadable in exactly the way
 * this is meant to prevent - the explanation is still there on hover, just
 * without the affordance. `@2xl/table` is ConsoleDataTable's own container
 * query, the same one that swaps cards for the real table.
 *
 * `HelpTip` rather than `HelpWrap` because a `<th>` in a sortable table is
 * already clickable: HelpTip's handler stops the event, so reading the
 * explanation never re-sorts the table underneath it.
 */
export function columnHelp(label: string, text: string) {
  return function HelpHeader() {
    return (
      <span className="inline-flex items-center gap-1">
        {label}
        <HelpTip
          className="hidden @2xl/table:inline-flex"
          label={`What does the ${label} column show?`}
          text={text}
        />
      </span>
    );
  };
}

/** Per-column console styling carried on TanStack column meta. */
export interface ConsoleColumnMeta {
  /** Applied to both th and td (alignment, mono, responsive hiding). */
  className?: string;
  /** Applied to th only. */
  headerClassName?: string;
  /**
   * Marks the table's ONE primary column. It claims 40% of the table's width
   * instead of sizing to its content, and the cell inside truncates at ~90% of
   * that share (85% when an avatar sits beside the text).
   *
   * Why a share and not a fixed cap. A `<table>` sizes each column to its
   * widest cell, so a column holding free text is always the one that decides
   * the table's width. Capping the CELL at a fixed width (max-w-[28rem]) does
   * not stop that: the column is still laid out to whatever the content wants,
   * and the clamped text then stops well short of the column's right edge -
   * the reader sees an ellipsis with dead space beside it, which is the worst
   * of both. Pinning the COLUMN to 40% and clamping the cell to 90% OF THAT
   * makes the text use the room it was given, and bounds the table at the same
   * time: no column may ever exceed 40%.
   *
   * `max-w-0` on the td is what makes the percentage authoritative. Without it
   * the cell's min-content width wins over `w-2/5` and the column grows again.
   *
   * NEVER put a `min-w-[…]` on anything inside a stretch cell. A minimum and a
   * share are contradictory instructions, and CSS resolves the contradiction in
   * the minimum's favour: `min-width` beats `max-width`, so the content keeps
   * the floor's width however narrow the column gets, `truncate` then clips
   * against the FLOOR rather than the cell, and the text runs out over the
   * next column. The transfers register did exactly that with a
   * `md:min-w-[11rem]` route. `min-w-0` is right; a floor never is.
   *
   * Exactly one column per table. Mark the one that says WHICH row this is.
   */
  stretch?: boolean;
}

declare module "@tanstack/react-table" {
  // The standard TanStack meta-augmentation shape - params/emptiness required.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-object-type
  interface ColumnMeta<TData, TValue> extends ConsoleColumnMeta {}
}

/**
 * One label/value line of the phone card.
 *
 * The pair is a WRAPPING flex row, which gives the value its two intended
 * shapes from a single rule. While the value fits beside the label it sits on
 * the same line, pushed to the right edge, and is free to spend ALL of the
 * space between the two - shrink-to-fit against the whole remainder of the
 * row, not some smaller strip. The moment it would collide with the label,
 * flex wrapping drops the whole value onto its own line UNDER the label,
 * where it starts at the left edge and wraps across the card's full width to
 * as many lines as it needs. A long value is never squeezed into a sliver
 * with dead space sitting beside the label.
 *
 * (For that to hold, nothing the cell renders may cap its own width in the
 * card view - see table-cells.tsx, whose clamps are all scoped to
 * `@2xl/table:` for exactly this reason. A percentage max-width inside a
 * shrink-to-fit flex item resolves against the item's own content-derived
 * width, which shaved values narrow and wrapped two-word cells while half
 * the row stood empty - the bug this layout replaces.)
 *
 * The one decision CSS cannot make is the text alignment: right-aligned is
 * correct while the value sits beside the label, but a stacked multi-line
 * value must read left to right like prose. Which shape the row took is only
 * knowable after layout - the value's box starts below the label's exactly
 * when it wrapped - so the component observes it and flips `text-align` to
 * match. The observation changes alignment ONLY, never a width, so it cannot
 * feed back into the wrap it is watching.
 *
 * The value span is BLOCK, not the default inline: cell content is routinely
 * a block element, and inside an inline parent its containing block resolves
 * further up the tree, letting wide content run off the side of the card.
 */
function CardField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  const labelRef = useRef<HTMLSpanElement | null>(null);
  const valueRef = useRef<HTMLSpanElement | null>(null);
  const [stacked, setStacked] = useState(false);

  useLayoutEffect(() => {
    const labelEl = labelRef.current;
    const valueEl = valueRef.current;
    if (!labelEl || !valueEl) return;
    // `items-start` puts both boxes at the top of their flex line, so the
    // value sits lower than the label exactly when it wrapped to its own
    // line (1px of tolerance for rounding).
    const measure = () =>
      setStacked(valueEl.offsetTop > labelEl.offsetTop + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(valueEl);
    if (valueEl.parentElement) observer.observe(valueEl.parentElement);
    return () => observer.disconnect();
  }, []);

  if (!label) {
    return (
      <div className="border-b border-adm-hairline py-1.5 text-[14px] last:border-b-0">
        <span className="block min-w-0 [overflow-wrap:anywhere] text-adm-body">
          {children}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-0.5 border-b border-adm-hairline py-1.5 text-[14px] last:border-b-0">
      <span
        ref={labelRef}
        className="flex-none pt-px text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase"
      >
        {label}
      </span>
      <span
        ref={valueRef}
        className={cn(
          "block min-w-0 [overflow-wrap:anywhere] text-adm-body",
          stacked ? "text-left" : "text-right",
        )}
      >
        {children}
      </span>
    </div>
  );
}

/**
 * The console data table (dms-frontend's TanStack + shadcn Table pattern in
 * the DB Plus skin). Screens own their search inputs and filters (pass the
 * query via `globalFilter`); the table owns sorting, selection and paging:
 *
 * - `enableSelection` injects the checkbox column; `renderBulkActions`
 *   receives the selected rows (and a clear function) and is rendered as a
 *   toolbar row while anything is selected - the home of "Delete selected".
 * - Pagination is the shared DataTablePagination footer with a rows-per-page
 *   selector, and - dms rule - it only appears once there are more rows than
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
   * rows to 48px made them overlap each other - the cramped, unreadable mobile
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
  /** True while a refetch is in flight - the current rows stay visible,
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
          className="cursor-pointer border-adm-strong"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
          className="cursor-pointer border-adm-strong"
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
          <div className="px-4 py-12 text-center text-[14px] text-adm-muted">
            Nothing here yet.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("@container/table min-w-0", className)}>
      {enableSelection && selectedRows.length > 0 && renderBulkActions ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-adm-line bg-adm-sunken px-4 py-2">
          <span className="text-[13.5px] font-semibold text-adm-body">
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
          room it was designed for - the cramped, overflowing layout this
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
              <div className="px-4 py-12 text-center text-[14px] text-adm-muted">
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
              // A DATA column carries an accessor - either form TanStack accepts,
              // accessorFn or accessorKey. Checking only accessorFn mistook an
              // accessorKey column (the expenses register's Voucher) for a row
              // action and dropped it to the card foot. An ACTION column is a
              // display column with neither.
              const isData = (c: (typeof visible)[number]) => {
                const def = c.column.columnDef as {
                  accessorFn?: unknown;
                  accessorKey?: unknown;
                };
                return Boolean(def.accessorFn ?? def.accessorKey);
              };
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
                    "rounded-none border border-adm-line bg-adm-card px-3.5 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.05)] data-[state=selected]:border-console/40 data-[state=selected]:bg-console/5",
                    href && "cursor-pointer hover:border-adm-strong",
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
                    // "DESCRIPTION -" placeholders is pure noise on a phone,
                    // and reserved slots that never fill are exactly the
                    // "unintentional negative space" to avoid.
                    const raw = cell.getValue();
                    if (raw === null || raw === undefined || raw === "") {
                      return null;
                    }
                    return (
                      <CardField key={cell.id} label={label}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </CardField>
                    );
                  })}
                  {actionCells.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap justify-end gap-1.5 border-t border-adm-hairline pt-1.5">
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
              className="border-adm-line bg-adm-sunken hover:bg-adm-sunken"
            >
              {headerGroup.headers.map((header) => {
                const meta = header.column.columnDef.meta;
                const sortable = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={cn(
                      "h-[38px] px-3 text-[10.5px] font-bold uppercase tracking-[0.09em] text-adm-muted",
                      sortable && "cursor-pointer select-none",
                      meta?.className,
                      meta?.headerClassName,
                      // Last, so the share wins over any width in the meta.
                      meta?.stretch && "w-2/5",
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
                  <div className="px-4 py-12 text-center text-[14px] text-adm-muted">
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
                    "border-adm-hairline data-[state=selected]:bg-console/5",
                    href && "cursor-pointer hover:bg-adm-hover",
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
                        "px-3 py-2.5 text-[14px] text-adm-body [&_p]:line-clamp-2",
                        cell.column.columnDef.meta?.className,
                        // max-w-0 is not cosmetic: without it the cell's
                        // min-content width beats w-2/5 and the column grows
                        // back to whatever the longest value wants.
                        cell.column.columnDef.meta?.stretch && "w-2/5 max-w-0",
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
        <div className="border-t border-adm-line px-4 py-2.5 text-[13.5px] text-adm-muted">
          {total} {itemNoun}
        </div>
      ) : null}
    </div>
  );
}
