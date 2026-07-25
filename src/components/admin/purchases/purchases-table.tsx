"use client";

import { useMemo } from "react";

import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleDateField,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetPurchasesQuery } from "@/redux/purchases/purchases-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { PurchaseSource } from "@/types/registry.types";
import {
  PurchaseStatus,
  type IPurchase,
  type IPurchaseListQuery,
} from "@/types/purchase.types";
import { columnMeta, Absent } from "@/components/admin/registry/registry-bits";
import {
  CompactCedis,
  ApprovalOverlayBadge,
  formatConsoleDate,
  PURCHASE_STATUS_FILTER_OPTIONS,
  purchaseCounterparty,
  PurchaseStatusBadge,
} from "./purchase-bits";

const LIST = "/admin/purchases";
const FILTER_DEFAULTS = {
  status: "all",
  source: "all",
  commodity: "all",
  warehouse: "all",
  from: "",
  to: "",
  size: "10",
};

const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: PurchaseSource.INDIVIDUAL, label: "Individual" },
  { value: PurchaseSource.COMPANY, label: "Company" },
  { value: PurchaseSource.AGENT, label: "Agent" },
] as const;

/** The live purchases register. */
/** Column ids stripped from the table when the caller may not see money. */
const MONEY_COLUMNS = new Set(["total", "price"]);

export function PurchasesTable() {
  const router = useRouter();
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

  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";
  const { status, source, commodity, warehouse, from, to } = filters;

  // Filter selects are fed from the registry (first page covers the
  // vocabulary at this scale; pickers in forms use the same source).
  const commodityOptions = useGetCommoditiesQuery({ limit: 100 });
  const warehouseOptions = useGetWarehousesQuery({ limit: 100 });

  const queryArgs = useMemo<IPurchaseListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status: status as PurchaseStatus } : {}),
      ...(source !== "all" ? { source: source as PurchaseSource } : {}),
      ...(commodity !== "all" ? { commodityId: commodity } : {}),
      ...(warehouse !== "all" ? { warehouseId: warehouse } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, search, status, source, commodity, warehouse, from, to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetPurchasesQuery(queryArgs);
  const purchases = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    [status, source, commodity, warehouse].filter((v) => v !== "all").length +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const showMoney = useMoneyVisibility();
  const columns = useMemo<ColumnDef<IPurchase, unknown>[]>(() => {
    const all: ColumnDef<IPurchase, unknown>[] = [
      {
        id: "purchase",
        accessorFn: (p) => p.commodity.name,
        header: "Purchase",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Link
              href={`${LIST}/${p.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {p.commodity.name}
                  <Mono className="ml-1.5 text-[12px] text-soil">
                    {formatKg(p.weightKg)}
                  </Mono>
                </span>
                <span className="block truncate text-[11.5px] text-soil/70">
                  {purchaseCounterparty(p)} · {formatConsoleDate(p.purchasedAt)}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "total",
        accessorFn: (p) => p.totalGhs,
        header: "Total",
        enableSorting: false,
        meta: columnMeta({ className: "text-right" }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-ink">
            <CompactCedis amount={row.original.totalGhs} />
          </Mono>
        ),
      },
      {
        id: "price",
        accessorFn: (p) => p.unitPriceGhs,
        header: "Price/kg",
        enableSorting: false,
        meta: columnMeta({ wide: true, className: "text-right" }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-soil">
            <CompactCedis amount={row.original.unitPriceGhs} />
          </Mono>
        ),
      },
      {
        id: "warehouse",
        accessorFn: (p) => p.warehouse?.name ?? "",
        header: "Warehouse",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.warehouse ? (
            <span className="whitespace-nowrap text-soil">
              {row.original.warehouse.name}
            </span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="flex flex-wrap items-center gap-1">
            <PurchaseStatusBadge status={row.original.status} />
            <ApprovalOverlayBadge approval={row.original.approval} />
          </span>
        ),
      },
    ];
    // Money columns are dropped outright rather than rendered as a column of
    // "Hidden" - the API redacts the values either way (financial visibility),
    // this just keeps the table readable.
    if (showMoney) return all;
    return all.filter((c) => !MONEY_COLUMNS.has(c.id ?? ""));
  }, [showMoney]);

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Purchases
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Goods bought at the farm gate and beyond - money is real from the
          moment a purchase is recorded
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search supplier, notes…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Record purchase</Link>
            </Button>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={PURCHASE_STATUS_FILTER_OPTIONS}
            active={status !== "all"}
            className="lg:w-[150px]"
          />
          <ConsoleLabeledSelect
            label="Source"
            value={source}
            onChange={(v) => setFilter("source", v)}
            options={SOURCE_FILTER_OPTIONS}
            active={source !== "all"}
            className="lg:w-[150px]"
          />
          <ConsoleLabeledSelect
            label="Commodity"
            value={commodity}
            onChange={(v) => setFilter("commodity", v)}
            options={[
              { value: "all", label: "All commodities" },
              ...(commodityOptions.data?.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
            active={commodity !== "all"}
            className="lg:w-[170px]"
          />
          <ConsoleLabeledSelect
            label="Warehouse"
            value={warehouse}
            onChange={(v) => setFilter("warehouse", v)}
            options={[
              { value: "all", label: "All warehouses" },
              ...(warehouseOptions.data?.data ?? []).map((w) => ({
                value: w.id,
                label: w.name,
              })),
            ]}
            active={warehouse !== "all"}
            className="lg:w-[170px]"
          />
          <ConsoleDateField
            label="From"
            value={from}
            max={to || undefined}
            onChange={(v) => setFilter("from", v)}
            className="lg:w-[150px]"
          />
          <ConsoleDateField
            label="To"
            value={to}
            min={from || undefined}
            onChange={(v) => setFilter("to", v)}
            className="lg:w-[150px]"
          />
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <DataTableSkeleton />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : purchases.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching purchases"
              description="Nothing matches this search and filter combination."
              actionLabel="Clear search & filters"
              onAction={() => {
                setSearch("");
                resetFilters();
              }}
            />
          ) : (
            <EmptyState
              variant="plain"
              title="No purchases yet"
              description="Record the first goods bought from a village or supplier."
              actionLabel="Record your first purchase"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IPurchase>
            columns={columns}
            data={purchases}
            itemNoun="purchases"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(p) => `${LIST}/${p.id}`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}
