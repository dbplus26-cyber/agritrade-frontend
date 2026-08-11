"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import { HelpTip } from "@/components/admin/help-tip";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminButton, AdminCard, Mono } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
  hint,
  children,
}: {
  label: string;
  /** One sentence on what this figure counts, shown on hover by the label. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <AdminCard className="px-4 py-3">
      <div className="flex items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What does ${label} count?`} text={hint} /> : null}
      </div>
      <div className="mt-1 text-[19px] font-bold text-adm-ink">{children}</div>
    </AdminCard>
  );
}

function SalesStats() {
  const { data } = useGetSaleStatsQuery();
  const stats = data?.data;
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatTile
        label="In progress"
        hint="Orders agreed with a buyer but not yet delivered and paid off."
      >
        {stats?.salesInProgress ?? "-"}
      </StatTile>
      <StatTile
        label="Agreed (live)"
        hint="What the buyers on those in-progress orders have agreed to pay you in total."
      >
        <Money value={stats?.agreedValueLiveGhs ?? null} />
      </StatTile>
      <StatTile
        label="Outstanding"
        hint="Money buyers still owe you across every order that is not paid off."
      >
        <span className="text-console-red">
          <Money value={stats?.outstandingGhs ?? null} />
        </span>
      </StatTile>
      <StatTile
        label="Debtors"
        hint="How many orders still have something left to pay on them."
      >
        {stats?.debtorSaleCount ?? "-"}
      </StatTile>
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
        meta: columnMeta({ stretch: true }),
        // A real anchor, not just a clickable row: keyboard focus, middle-click
        // and "open in new tab" all come free from it, and none of them work on
        // a div with an onClick. stopPropagation so the row handler doesn't
        // navigate a second time.
        cell: ({ row }) => (
          <Link
            href={`/admin/sales/${row.original.id}`}
            className="block w-full min-w-0 outline-none focus-visible:underline"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <div className="@2xl/table:max-w-[90%] [overflow-wrap:anywhere] @2xl/table:truncate font-semibold text-adm-ink">
              {row.original.buyer.name}
            </div>
          </Link>
        ),
      },
      {
        id: "agreed",
        header: columnHelp(
          "Agreed",
          "The full price the buyer agreed to pay for this order.",
        ),
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            <Money value={row.original.agreedTotalGhs} />
          </Mono>
        ),
      },
      {
        id: "balance",
        header: columnHelp(
          "Balance",
          "What the buyer still owes you on this order after everything they have paid.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const b = row.original.balanceGhs;
          return (
            <Mono
              className={cn(
                "whitespace-nowrap font-semibold",
                b === null
                  ? "text-adm-faint"
                  : b === 0
                    ? "text-console"
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
        hint="Narrows to orders a buyer still owes money on, so you can chase only those."
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Sales
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Agreements with buyers, payments and balances
          </p>
        </div>
        {<AdminButton asChild>
          <Link href={`${LIST}/new`}>+ New sale</Link>
        </AdminButton>}
      </div>

      {pristine ? (
        <RegisterEmpty
          filtered={false}
          noun="sales"
          description="Draft your first sale to start tracking agreements and balances."
          actionLabel="Draft your first sale"
          onAction={() => router.push(`${LIST}/new`)}
        />
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
            <RegisterEmpty
              filtered
              noun="sales"
              description=""
              onClear={() => {
                setSearch("");
                resetFilters();
              }}
            />
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
                  rowClassName={() => "h-12 hover:bg-adm-sunken"}
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
                    className="shadow-[0_1px_2px_rgba(16,24,40,0.05)] rounded-none border border-adm-line bg-adm-card px-3.5 py-[13px] text-left"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="block @2xl/table:max-w-[22rem] [overflow-wrap:anywhere] @2xl/table:truncate text-[14px] font-semibold text-adm-ink">
                        {s.buyer.name}
                      </span>
                      <SaleStatusBadge status={s.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">Balance</span>
                      <Mono
                        className={cn(
                          "text-[14px] font-bold",
                          s.balanceGhs === 0 ? "text-console" : "text-console-red",
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
