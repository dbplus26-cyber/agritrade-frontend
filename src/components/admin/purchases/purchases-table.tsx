"use client";

import { useMemo } from "react";

import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { usePermissions } from "@/hooks/use-permissions";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";
import {
  ConsoleFilterBar,
  ConsoleDateRange,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import {
  adminLinkClass,
  AdminButton,
  AdminCard,
  AdminPageHeader,
  Mono,
} from "@/components/admin/ui";
import { cn } from "@/lib/utils";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetPurchasesQuery } from "@/redux/purchases/purchases-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { DateOnlyCell } from "@/components/admin/date-cell";
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
  PURCHASE_STATUS_FILTER_OPTIONS,
  purchaseCounterparty,
  PurchaseStatusBadge,
  SettlementBadge,
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
  const { has } = usePermissions();
  const canRecord = has("PURCHASES_RECORD");
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
  const commodityFilterOptions = [
    { value: "all", label: "All commodities" },
    ...(commodityOptions.data?.data ?? []).map((c) => ({
      value: c.id,
      label: c.name,
    })),
  ];
  const warehouseFilterOptions = [
    { value: "all", label: "All warehouses" },
    ...(warehouseOptions.data?.data ?? []).map((w) => ({
      value: w.id,
      label: w.name,
    })),
  ];

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
  // A register with nothing on file and nothing narrowing it shows ONLY the
  // empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading &&
    !isError &&
    purchases.length === 0 &&
    !search &&
    activeFilterCount === 0;

  const showMoney = useMoneyVisibility();
  const columns = useMemo<ColumnDef<IPurchase, unknown>[]>(() => {
    const all: ColumnDef<IPurchase, unknown>[] = [
      {
        id: "purchase",
        accessorFn: (p) => p.commodity.name,
        header: "Purchase",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const p = row.original;
          return (
            <Link
              href={`${LIST}/${p.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="block min-w-0 @2xl/table:max-w-[90%]">
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                  {p.commodity.name}
                  <Mono className="ml-1.5 text-[11px] text-adm-muted">
                    {formatKg(p.weightKg)}
                  </Mono>
                </span>
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[11px] text-adm-faint">
                  {purchaseCounterparty(p)}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "total",
        accessorFn: (p) => p.totalGhs,
        // The purchase price, and it says so. Since costs can be taken into
        // the goods, "total" is a word with two meanings, and this column
        // carries the one somebody reconciles a supplier's invoice against.
        // Widening it in place would change a figure people check without
        // changing anything they could see. The landed figure is on the
        // purchase itself, where it can be broken out.
        header: columnHelp(
          "Total",
          "The price of the grain itself: the weight bought times the price per kg. Haulage, loading and the rest of what it cost to get it in are not in this figure - open the purchase to see those.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "trailing" }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            <CompactCedis amount={row.original.totalGhs} />
          </Mono>
        ),
      },
      {
        id: "paid",
        accessorFn: (p) => p.settlement?.status ?? "",
        header: columnHelp(
          "Paid?",
          "Whether the supplier has actually been paid. Recording a purchase does not move money - paying for it does.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => (
          <SettlementBadge settlement={row.original.settlement} />
        ),
      },
      {
        id: "date",
        accessorFn: (p) => p.purchasedAt,
        header: "Date",
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => <DateOnlyCell value={row.original.purchasedAt} />,
      },
      {
        id: "price",
        accessorFn: (p) => p.unitPriceGhs,
        header: columnHelp(
          "Price/kg",
          "What you paid for one kilogram of this commodity on this purchase.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-muted">
            <CompactCedis amount={row.original.unitPriceGhs} />
          </Mono>
        ),
      },
      {
        id: "warehouse",
        accessorFn: (p) => p.warehouse?.name ?? "",
        header: "Warehouse",
        enableSorting: false,
        meta: columnMeta({ at: "lg", card: "meta" }),
        cell: ({ row }) =>
          row.original.warehouse ? (
            // The row itself navigates to the purchase, so the warehouse has
            // to stop the click reaching it or the two destinations race.
            <Link
              className={cn(adminLinkClass, "block @2xl/table:max-w-[22rem] [overflow-wrap:anywhere] @2xl/table:truncate")}
              href={`/admin/warehouses/${row.original.warehouse.id}`}
              onClick={(e) => e.stopPropagation()}
            >
              {row.original.warehouse.name}
            </Link>
          ) : (
            <Absent />
          ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
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
      <AdminPageHeader
        title="Purchases"
        sub="Goods bought at the farm gate and beyond - money is real from the moment a purchase is recorded"
      />

      {pristine || (isError && !search && activeFilterCount === 0) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search supplier, notes…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="purchases"
          action={
            canRecord ? (
              <AdminButton asChild aria-label="Record purchase">
                <Link href={`${LIST}/new`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Record purchase</span>
                </Link>
              </AdminButton>
            ) : null
          }
          panelClassName="sm:grid-cols-2 lg:grid-cols-6"
          chips={
            <>
              {status !== "all" ? (
                <FilterChip onRemove={() => setFilter("status", "all")}>
                  Status: {labelOf(PURCHASE_STATUS_FILTER_OPTIONS, status)}
                </FilterChip>
              ) : null}
              {source !== "all" ? (
                <FilterChip onRemove={() => setFilter("source", "all")}>
                  Source: {labelOf(SOURCE_FILTER_OPTIONS, source)}
                </FilterChip>
              ) : null}
              {commodity !== "all" ? (
                <FilterChip onRemove={() => setFilter("commodity", "all")}>
                  Commodity: {labelOf(commodityFilterOptions, commodity)}
                </FilterChip>
              ) : null}
              {warehouse !== "all" ? (
                <FilterChip onRemove={() => setFilter("warehouse", "all")}>
                  Warehouse: {labelOf(warehouseFilterOptions, warehouse)}
                </FilterChip>
              ) : null}
              {from ? (
                <FilterChip onRemove={() => setFilter("from", "")}>
                  From: {from}
                </FilterChip>
              ) : null}
              {to ? (
                <FilterChip onRemove={() => setFilter("to", "")}>
                  To: {to}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={PURCHASE_STATUS_FILTER_OPTIONS}
            active={status !== "all"}
          />
          <ConsoleLabeledSelect
            hint="Who the grain came from: an individual farmer, a company, or one of your own agents."
            label="Source"
            value={source}
            onChange={(v) => setFilter("source", v)}
            options={SOURCE_FILTER_OPTIONS}
            active={source !== "all"}
          />
          <ConsoleLabeledSelect
            label="Commodity"
            value={commodity}
            onChange={(v) => setFilter("commodity", v)}
            options={commodityFilterOptions}
            active={commodity !== "all"}
          />
          <ConsoleLabeledSelect
            label="Warehouse"
            value={warehouse}
            onChange={(v) => setFilter("warehouse", v)}
            options={warehouseFilterOptions}
            active={warehouse !== "all"}
          />
          <ConsoleDateRange
            from={from}
            to={to}
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
      ) : purchases.length === 0 ? (
        <RegisterEmpty
          filtered={Boolean(search) || activeFilterCount > 0}
          noun="purchases"
          description="Record the first goods bought from a village or supplier."
          actionLabel={canRecord ? "Record your first purchase" : undefined}
          onAction={canRecord ? () => router.push(`${LIST}/new`) : undefined}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
