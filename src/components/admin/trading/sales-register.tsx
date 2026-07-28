"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import {
  useGetSalesQuery,
  useGetSaleStatsQuery,
} from "@/redux/sales/admin-sales-api";
import type { ISale, ISaleListQuery, SaleStatus } from "@/types/admin-sale.types";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import {
  Money,
  SALE_STATUS_FILTER_OPTIONS,
  SaleStatusBadge,
} from "./sale-bits";

const LIST = "/admin/sales";
const FILTER_DEFAULTS = {
  status: "all",
  outstanding: "no",
  from: "",
  to: "",
  size: "10",
};

const OUTSTANDING_OPTIONS = [
  { label: "All sales", value: "no" },
  { label: "Outstanding only", value: "yes" },
] as const;

/** A headline stat tile in the sales strip. */
function StatTile({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="px-4 py-3">
      <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
        {label}
      </div>
      <div className="mt-1 text-[19px] font-bold text-ink">{children}</div>
    </AdminCard>
  );
}

function SalesStats() {
  const { data } = useGetSaleStatsQuery();
  const stats = data?.data;
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile label="In progress">{stats?.salesInProgress ?? "-"}</StatTile>
      <StatTile label="Agreed (live)">
        <Money value={stats?.agreedValueLiveGhs ?? null} />
      </StatTile>
      <StatTile label="Outstanding">
        <span className="text-console-red">
          <Money value={stats?.outstandingGhs ?? null} />
        </span>
      </StatTile>
      <StatTile label="Debtors">{stats?.debtorSaleCount ?? "-"}</StatTile>
    </div>
  );
}

/** The live sales register. */
export function SalesRegister() {
  const router = useRouter();
  const {
    page,
    filters,
    setFilter,
    setPage,
    resetFilters,
    search: searchInput,
    setSearch,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";
  const { status, outstanding, from, to } = filters;

  const queryArgs = useMemo<ISaleListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(status !== "all" ? { status: status as SaleStatus } : {}),
      ...(outstanding === "yes" ? { outstanding: true } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, search, status, outstanding, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetSalesQuery(queryArgs);
  const sales = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (outstanding === "yes" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);
  // A register with nothing on file and nothing narrowing it shows ONLY the
  // empty state - stat tiles and a filter bar over zero rows filter nothing.
  const pristine =
    !isLoading &&
    !isError &&
    sales.length === 0 &&
    !search &&
    activeFilterCount === 0;

  const columns = useMemo<ColumnDef<ISale, unknown>[]>(
    () => [
      {
        id: "buyer",
        accessorFn: (s) => s.buyer.name,
        header: "Buyer",
        enableSorting: false,
        meta: columnMeta(),
        // A real anchor, not just a clickable row: keyboard focus, middle-click
        // and "open in new tab" all come free from it, and none of them work on
        // a div with an onClick. stopPropagation so the row handler doesn't
        // navigate a second time.
        cell: ({ row }) => (
          <Link
            href={`/admin/sales/${row.original.id}`}
            className="block min-w-0 outline-none focus-visible:underline"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="truncate font-semibold text-ink">
              {row.original.buyer.name}
            </div>
          </Link>
        ),
      },
      {
        id: "agreed",
        header: "Agreed",
        enableSorting: false,
        meta: columnMeta({ className: "text-right", wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-ink">
            <Money value={row.original.agreedTotalGhs} />
          </Mono>
        ),
      },
      {
        id: "balance",
        header: "Balance",
        enableSorting: false,
        meta: columnMeta({ className: "text-right" }),
        cell: ({ row }) => {
          const b = row.original.balanceGhs;
          return (
            <Mono
              className={cn(
                "whitespace-nowrap text-[12.5px] font-semibold",
                b === null
                  ? "text-soil/50"
                  : b === 0
                    ? "text-leaf"
                    : "text-console-red",
              )}
            >
              {b === 0 ? "Paid in full" : <Money value={b} />}
            </Mono>
          );
        },
      },
      {
        id: "date",
        header: "Date",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <SaleStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  const filterBar = (
    <ConsoleFilterBar
      search={searchInput}
      onSearch={setSearch}
      searchPlaceholder="Search buyer…"
      activeCount={activeFilterCount}
      onClear={resetFilters}
      action={
        <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
          <Link href={`${LIST}/new`}>+ New sale</Link>
        </Button>
      }
    >
      <ConsoleLabeledSelect
        label="Status"
        value={status}
        onChange={(v) => setFilter("status", v)}
        options={SALE_STATUS_FILTER_OPTIONS}
        active={status !== "all"}
        className="lg:w-[160px]"
      />
      <ConsoleLabeledSelect
        label="Balance"
        value={outstanding}
        onChange={(v) => setFilter("outstanding", v)}
        options={OUTSTANDING_OPTIONS}
        active={outstanding === "yes"}
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
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Sales
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Agreements with buyers, payments and balances
        </p>
      </div>

      {pristine ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No sales yet"
            description="Draft your first sale to start tracking agreements and balances."
            actionLabel="Draft your first sale"
            onAction={() => router.push(`${LIST}/new`)}
          />
        </AdminCard>
      ) : (
        <>
          <SalesStats />

          {isError && !search && activeFilterCount === 0 ? null : filterBar}

          {isLoading ? (
            <ConsoleTableSkeleton columns={5} />
          ) : isError ? (
            <ErrorMessage
              description={extractApiError(error).message}
              onRetry={() => void refetch()}
            />
          ) : sales.length === 0 ? (
            // Not pristine, so a search or filter is narrowing the register.
            <AdminCard className="overflow-hidden">
              <EmptyState
                variant="plain"
                title="No matching sales"
                description="Nothing matches this search and filter combination."
                actionLabel="Clear search & filters"
                onAction={() => {
                  setSearch("");
                  resetFilters();
                }}
              />
            </AdminCard>
          ) : (
            <>
              <AdminCard className="hidden overflow-hidden md:block">
                <ConsoleDataTable<ISale>
                  columns={columns}
                  data={sales}
                  itemNoun="sales"
                  serverPagination={{
                    totalCount,
                    page,
                    pageSize,
                    onPageChange: setPage,
                    onPageSizeChange: (size) => setFilter("size", String(size)),
                  }}
                  rowHref={(s) => `${LIST}/${s.id}`}
                  rowClassName={() => "h-12 hover:bg-surface-alt/60"}
                />
              </AdminCard>

              {/* Mobile cards */}
              <div className="flex flex-col gap-2.5 md:hidden">
                {sales.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => router.push(`${LIST}/${s.id}`)}
                    // Squared and 1.5px-bordered to match AdminCard, the
                    // surface every other console screen is filed on.
                    className="shadow-doc-sm rounded-none border-[1.5px] border-soil/30 bg-paper px-3.5 py-[13px] text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[14px] font-semibold text-ink">
                        {s.buyer.name}
                      </span>
                      <SaleStatusBadge status={s.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] text-soil">Balance</span>
                      <Mono
                        className={cn(
                          "text-[14px] font-bold",
                          s.balanceGhs === 0 ? "text-leaf" : "text-console-red",
                        )}
                      >
                        {s.balanceGhs === 0 ? (
                          "Paid in full"
                        ) : (
                          <Money value={s.balanceGhs} />
                        )}
                      </Mono>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
