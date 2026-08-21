"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
  AdminButton,
  adminLinkClass,
  AdminCard,
  AdminPageHeader,
  Mono,
} from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { usePermissions } from "@/hooks/use-permissions";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
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
  const { has } = usePermissions();
  const canCount = has("STOCK_MANAGE");
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
        header: columnHelp(
          "Stocktake #",
          "The reference this count was filed under, for quoting it later.",
        ),
        accessorFn: (s) => s.transactionNo,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            {row.original.transactionNo}
          </Mono>
        ),
      },
      {
        id: "warehouse",
        header: "Warehouse",
        accessorFn: (s) => s.warehouse.name,
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        // The row navigates to the stocktake, so the warehouse has to stop
        // the click reaching it or the two destinations race.
        cell: ({ row }) => (
          <Link
            className={cn(
              adminLinkClass,
              "block min-w-0 @2xl/table:max-w-[90%] font-medium @2xl/table:line-clamp-1 whitespace-normal [overflow-wrap:anywhere]",
            )}
            href={`/admin/warehouses/${row.original.warehouse.id}`}
            onClick={(e) => e.stopPropagation()}
            title={row.original.warehouse.name}
          >
            {row.original.warehouse.name}
          </Link>
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
        header: columnHelp(
          "Lines",
          "How many different commodities were counted on this sheet.",
        ),
        accessorFn: (s) => s.lines.length,
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="text-adm-ink">
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
      <AdminPageHeader
        title="Stocktakes"
        sub="Physical counts checked against the book - approved differences post as adjustments"
      />

      {pristine ? null : (
        <ConsoleFilterBar
          hideSearch
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="stocktakes"
          action={
            canCount ? (
              <AdminButton asChild aria-label="New stocktake">
                <Link href={`${LIST}/new`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">New stocktake</span>
                </Link>
              </AdminButton>
            ) : null
          }
          panelClassName="sm:grid-cols-2"
          chips={
            <>
              {filters.status !== "all" ? (
                <FilterChip onRemove={() => setFilter("status", "all")}>
                  Status:{" "}
                  {labelOf(STOCKTAKE_STATUS_FILTER_OPTIONS, filters.status)}
                </FilterChip>
              ) : null}
              {filters.warehouse !== "all" ? (
                <FilterChip onRemove={() => setFilter("warehouse", "all")}>
                  Warehouse: {labelOf(warehouseOptions, filters.warehouse)}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={filters.status}
            onChange={(v) => setFilter("status", v)}
            options={STOCKTAKE_STATUS_FILTER_OPTIONS}
            active={filters.status !== "all"}
          />
          <ConsoleLabeledSelect
            label="Warehouse"
            value={filters.warehouse}
            onChange={(v) => setFilter("warehouse", v)}
            options={warehouseOptions}
            active={filters.warehouse !== "all"}
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
        <RegisterEmpty
          filtered={activeFilterCount > 0}
          noun="stocktakes"
          description="Start a count sheet to check a warehouse against the book."
          filteredDescription="Nothing matches this filter."
          actionLabel={canCount ? "New stocktake" : undefined}
          onAction={canCount ? () => router.push(`${LIST}/new`) : undefined}
          onClear={resetFilters}
        />
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
