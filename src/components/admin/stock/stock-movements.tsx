"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { adminLinkClass, AdminCard } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetStockMovementsQuery } from "@/redux/stock/stock-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { columnMeta, Absent } from "@/components/admin/registry/registry-bits";
import { TextCell, TitleCell } from "@/components/admin/table-cells";
import { DateTimeCell } from "@/components/admin/date-cell";
import type {
  IStockMovement,
  IStockMovementsQuery,
  StockMoveType,
} from "@/types/stock.types";
import { MOVE_TYPE_FILTER_OPTIONS, MoveTypeBadge, SignedKg } from "./stock-bits";

const FILTER_DEFAULTS = {
  type: "all",
  warehouse: "all",
  commodity: "all",
  from: "",
  to: "",
  size: "20",
};

/** The append-only movements ledger behind the Stock screen's toggle. */
export function StockMovements({
  warehouseOptions,
  commodityOptions,
  action,
  leading,
}: {
  warehouseOptions: readonly { value: string; label: string }[];
  commodityOptions: readonly { value: string; label: string }[];
  /** The page's action ("Request adjustment"), shown in the toolbar. */
  action?: ReactNode;
  /** The page's section tabs, at the left of the toolbar row. */
  leading?: ReactNode;
}) {
  const {
    page,
    search: searchInput,
    filters,
    setSearch,
    setFilter,
    setPage,
    resetFilters,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });
  const pageSize = Number(filters.size) || 20;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IStockMovementsQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(filters.type !== "all"
        ? { type: filters.type as StockMoveType }
        : {}),
      ...(filters.warehouse !== "all" ? { warehouseId: filters.warehouse } : {}),
      ...(filters.commodity !== "all" ? { commodityId: filters.commodity } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, pageSize, search, filters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetStockMovementsQuery(queryArgs);
  const movements = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (filters.type !== "all" ? 1 : 0) +
    (filters.warehouse !== "all" ? 1 : 0) +
    (filters.commodity !== "all" ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A ledger with nothing on file and no filters narrowing it shows ONLY the
  // empty state - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && movements.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IStockMovement, unknown>[]>(
    () => [
      {
        id: "entry",
        header: columnHelp(
          "Entry",
          "One line of the stock ledger: which commodity moved, and at which warehouse.",
        ),
        enableSorting: false,
        meta: columnMeta({ className: "py-2", stretch: true }),
        // Commodity leads, its warehouse sits underneath as the quiet second
        // line - the register convention. Run together on one unbounded line,
        // a long commodity name and a long warehouse name between them would
        // decide how wide this table gets.
        cell: ({ row }) => (
          // The commodity carries the row's link (TitleCell keeps a table's
          // identity column in ink by design). The warehouse underneath is
          // TitleCell's plain meta line and cannot hold one of its own.
          <TitleCell
            href={`/admin/commodities/${row.original.commodity.id}`}
            meta={row.original.warehouse.name}
            stretch
            title={row.original.commodity.name}
          />
        ),
      },
      {
        id: "type",
        header: "Type",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <MoveTypeBadge type={row.original.type} />,
      },
      {
        id: "delta",
        header: columnHelp(
          "Change",
          "How much weight this line added to the warehouse or took out of it.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <SignedKg kg={row.original.deltaKg} />,
      },
      {
        id: "when",
        header: "When",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.occurredAt} />,
      },
      {
        id: "reason",
        header: columnHelp(
          "Reason / source",
          "Why the weight moved, or the record it came from, such as the purchase it was received against.",
        ),
        enableSorting: false,
        // A secondary column, hidden below xl - so it keeps a fixed cap rather
        // than a share. Only the always-visible primary column stretches.
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) =>
          row.original.reason ? (
            <TextCell
              className="text-adm-muted"
              value={row.original.reason}
              width="prose"
            />
          ) : row.original.purchaseId ? (
            <Link
              href={`/admin/purchases/${row.original.purchaseId}`}
              className={adminLinkClass}
            >
              View purchase
            </Link>
          ) : (
            <Absent />
          ),
      },
    ],
    [],
  );

  return (
    <div>
      {pristine ? (
        // An empty ledger filters nothing, but the section tabs and the
        // action still need their row.
        leading || action ? (
          <ConsoleFilterBar hideSearch leading={leading} action={action} />
        ) : null
      ) : (
      <ConsoleFilterBar
        search={searchInput}
        onSearch={setSearch}
        searchPlaceholder="Search commodity, warehouse, reason…"
        activeCount={activeFilterCount}
        onClear={() => {
          setSearch("");
          resetFilters();
        }}
        totalCount={totalCount}
        noun="movements"
        action={action}
        leading={leading}
        panelClassName="sm:grid-cols-2 lg:grid-cols-5"
        chips={
          <>
            {filters.type !== "all" ? (
              <FilterChip onRemove={() => setFilter("type", "all")}>
                Type: {labelOf(MOVE_TYPE_FILTER_OPTIONS, filters.type)}
              </FilterChip>
            ) : null}
            {filters.warehouse !== "all" ? (
              <FilterChip onRemove={() => setFilter("warehouse", "all")}>
                Warehouse: {labelOf(warehouseOptions, filters.warehouse)}
              </FilterChip>
            ) : null}
            {filters.commodity !== "all" ? (
              <FilterChip onRemove={() => setFilter("commodity", "all")}>
                Commodity: {labelOf(commodityOptions, filters.commodity)}
              </FilterChip>
            ) : null}
            {filters.from ? (
              <FilterChip onRemove={() => setFilter("from", "")}>
                From: {filters.from}
              </FilterChip>
            ) : null}
            {filters.to ? (
              <FilterChip onRemove={() => setFilter("to", "")}>
                To: {filters.to}
              </FilterChip>
            ) : null}
          </>
        }
      >
        <ConsoleLabeledSelect
          label="Type"
          value={filters.type}
          onChange={(v) => setFilter("type", v)}
          options={MOVE_TYPE_FILTER_OPTIONS}
          active={filters.type !== "all"}
        />
        <ConsoleLabeledSelect
          label="Warehouse"
          value={filters.warehouse}
          onChange={(v) => setFilter("warehouse", v)}
          options={warehouseOptions}
          active={filters.warehouse !== "all"}
        />
        <ConsoleLabeledSelect
          label="Commodity"
          value={filters.commodity}
          onChange={(v) => setFilter("commodity", v)}
          options={commodityOptions}
          active={filters.commodity !== "all"}
        />
        <ConsoleDateRange
          from={filters.from}
          to={filters.to}
          onFromChange={(v) => setFilter("from", v)}
          onToChange={(v) => setFilter("to", v)}
        />
      </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={6} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : movements.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="movements"
          title="No movements on file"
          description="Every receipt, load and approved adjustment lands here as a ledger line."
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        // On a card, like every other register and like this screen's own
        // empty state. Rows sitting directly on the page background with no
        // sheet under them read as a different kind of screen.
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable
            columns={columns}
            data={movements}
            itemNoun="movements"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
          />
        </AdminCard>
      )}
    </div>
  );
}
