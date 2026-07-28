"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard } from "@/components/admin/ui";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetStockMovementsQuery } from "@/redux/stock/stock-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { columnMeta, Absent } from "@/components/admin/registry/registry-bits";
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
}: {
  warehouseOptions: readonly { value: string; label: string }[];
  commodityOptions: readonly { value: string; label: string }[];
}) {
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const pageSize = Number(filters.size) || 20;

  const queryArgs = useMemo<IStockMovementsQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(filters.type !== "all"
        ? { type: filters.type as StockMoveType }
        : {}),
      ...(filters.warehouse !== "all" ? { warehouseId: filters.warehouse } : {}),
      ...(filters.commodity !== "all" ? { commodityId: filters.commodity } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, pageSize, filters],
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

  const columns = useMemo<ColumnDef<IStockMovement, unknown>[]>(
    () => [
      {
        id: "entry",
        header: "Entry",
        enableSorting: false,
        meta: columnMeta({ className: "py-2" }),
        // The always-visible lead cell: commodity + warehouse on top, the
        // type chip beneath.
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate text-[13.5px] font-semibold text-ink">
              {row.original.commodity.name}
              <span className="ml-2 font-normal text-soil">
                {row.original.warehouse.name}
              </span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <MoveTypeBadge type={row.original.type} />
            </div>
          </div>
        ),
      },
      {
        id: "delta",
        header: "Change",
        enableSorting: false,
        meta: columnMeta({ className: "text-right" }),
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
        header: "Reason / source",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.reason ? (
            <span
              className="block max-w-[280px] truncate text-soil"
              title={row.original.reason}
            >
              {row.original.reason}
            </span>
          ) : row.original.purchaseId ? (
            <Link
              href={`/admin/purchases/${row.original.purchaseId}`}
              className="text-console underline-offset-2 hover:underline"
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
      <ConsoleFilterBar
        search=""
        onSearch={() => undefined}
        hideSearch
        activeCount={activeFilterCount}
        onClear={resetFilters}
      >
        <ConsoleLabeledSelect
          label="Type"
          value={filters.type}
          onChange={(v) => setFilter("type", v)}
          options={MOVE_TYPE_FILTER_OPTIONS}
          active={filters.type !== "all"}
          className="lg:w-[170px]"
        />
        <ConsoleLabeledSelect
          label="Warehouse"
          value={filters.warehouse}
          onChange={(v) => setFilter("warehouse", v)}
          options={warehouseOptions}
          active={filters.warehouse !== "all"}
          className="lg:w-[180px]"
        />
        <ConsoleLabeledSelect
          label="Commodity"
          value={filters.commodity}
          onChange={(v) => setFilter("commodity", v)}
          options={commodityOptions}
          active={filters.commodity !== "all"}
          className="lg:w-[180px]"
        />
        <ConsoleDateField
          label="From"
          value={filters.from}
          max={filters.to || undefined}
          onChange={(v) => setFilter("from", v)}
          className="lg:w-[150px]"
        />
        <ConsoleDateField
          label="To"
          value={filters.to}
          min={filters.from || undefined}
          onChange={(v) => setFilter("to", v)}
          className="lg:w-[150px]"
        />
      </ConsoleFilterBar>

      {isLoading ? (
        <DataTableSkeleton />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : movements.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            title="No movements on file"
            description="Every receipt, load and approved adjustment lands here as a ledger line."
          />
        </AdminCard>
      ) : (
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
      )}
    </div>
  );
}
