"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { DateTimeCell } from "@/components/admin/date-cell";
import { AdminCard, Mono } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetStocktakesQuery } from "@/redux/stocktakes/stocktakes-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import type { IStocktake, IStocktakeListQuery } from "@/types/ops.types";
import type { StocktakeStatus } from "@/types/ops.types";
import {
  STOCKTAKE_STATUS_FILTER_OPTIONS,
  StocktakeStatusBadge,
} from "./stocktake-bits";

const LIST = "/admin/stocktakes";
const FILTER_DEFAULTS = { status: "all", warehouse: "all", size: "10" };

/** /admin/stocktakes - the physical count sheets register. */
export function StocktakesScreen() {
  const router = useRouter();
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });
  const pageSize = Number(filters.size) || 10;

  const { data: warehousesData } = useGetWarehousesQuery({
    isActive: true,
    limit: 100,
  });

  const queryArgs = useMemo<IStocktakeListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(filters.status !== "all"
        ? { status: filters.status as StocktakeStatus }
        : {}),
      ...(filters.warehouse !== "all"
        ? { warehouseId: filters.warehouse }
        : {}),
    }),
    [page, pageSize, filters],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetStocktakesQuery(queryArgs);
  const stocktakes = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (filters.status !== "all" ? 1 : 0) + (filters.warehouse !== "all" ? 1 : 0);
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading &&
    !isError &&
    stocktakes.length === 0 &&
    activeFilterCount === 0;

  const warehouseOptions = useMemo(
    () => [
      { value: "all", label: "All warehouses" },
      ...(warehousesData?.data ?? []).map((w) => ({
        value: w.id,
        label: w.name,
      })),
    ],
    [warehousesData],
  );

  const columns = useMemo<ColumnDef<IStocktake, unknown>[]>(
    () => [
      {
        id: "transactionNo",
        header: "Stocktake #",
        accessorFn: (s) => s.transactionNo,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-adm-ink">
            {row.original.transactionNo}
          </Mono>
        ),
      },
      {
        id: "warehouse",
        header: "Warehouse",
        accessorFn: (s) => s.warehouse.name,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span
            className="block min-w-0 max-w-[240px] text-[13px] font-medium text-adm-ink line-clamp-1 whitespace-normal [overflow-wrap:anywhere]"
            title={row.original.warehouse.name}
          >
            {row.original.warehouse.name}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (s) => s.status,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <StocktakeStatusBadge status={row.original.status} />
        ),
      },
      {
        id: "lines",
        header: "Lines",
        accessorFn: (s) => s.lines.length,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="text-[12.5px] text-adm-ink">
            {row.original.lines.length}
          </Mono>
        ),
      },
      {
        id: "created",
        header: "Created",
        accessorFn: (s) => s.createdAt,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Stocktakes
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Physical counts checked against the book - approved differences post
          as adjustments
        </p>
      </div>

      {pristine ? null : (
        <ConsoleFilterBar
          search=""
          onSearch={() => undefined}
          hideSearch
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button
              asChild
              variant="default"
              className="h-[34px] rounded-[6px] bg-console px-3.5 text-[13px] font-semibold text-white shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-console-hover hover:shadow-none"
            >
              <Link href={`${LIST}/new`}>+ New stocktake</Link>
            </Button>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={STOCKTAKE_STATUS_FILTER_OPTIONS}
            active={filters.status !== "all"}
            className="lg:w-[160px]"
          />
          <ConsoleLabeledSelect
            label="Warehouse"
            value={filters.warehouse}
            onChange={(v) => setFilter("warehouse", v)}
            options={warehouseOptions}
            active={filters.warehouse !== "all"}
            className="lg:w-[190px]"
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : stocktakes.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              activeFilterCount > 0
                ? "No matching stocktakes"
                : "No stocktakes yet"
            }
            description={
              activeFilterCount > 0
                ? "Nothing matches this filter."
                : "Start a count sheet to check a warehouse against the book."
            }
            actionLabel={activeFilterCount > 0 ? undefined : "New stocktake"}
            onAction={
              activeFilterCount > 0
                ? undefined
                : () => router.push(`${LIST}/new`)
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IStocktake>
            columns={columns}
            data={stocktakes}
            itemNoun="stocktakes"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(s) => `${LIST}/${s.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
