"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import { HelpTip } from "@/components/admin/help-tip";
import { Plus } from "lucide-react";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import {
  AdminButton,
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
import {
  hasSettledTotal,
  saleBalanceGhs,
  saleIsPaidInFull,
} from "./sale-payable";

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
  const { has } = usePermissions();
  const canManage = has("SALES_MANAGE");
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
        meta: columnMeta({ card: "title", stretch: true }),
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
          "The full price the buyer agreed to pay for this order. It stands whatever the load weighed on arrival.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "trailing", wide: true }),
        // The agreement, and under it what the load settled at once it was
        // weighed in - never in place of it. Absent where nothing has been
        // weighed, so the column stays one line on most rows.
        cell: ({ row }) => (
          <div className="min-w-0">
            <Mono className="block whitespace-nowrap text-adm-ink">
              <Money value={row.original.agreedTotalGhs} />
            </Mono>
            {hasSettledTotal(row.original) ? (
              <Mono className="block whitespace-nowrap text-[11.5px] text-adm-muted">
                settled <Money value={row.original.settledTotalGhs} />
              </Mono>
            ) : null}
          </div>
        ),
      },
      {
        id: "balance",
        header: columnHelp(
          "Balance",
          "What the buyer still owes you on this order after everything they have paid.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => {
          // Against what the sale is payable at, so this column agrees with
          // the balance on the sale itself and with the API's overpayment
          // guard - a sale carries two totals, and all three resolve them the
          // same way.
          const b = saleBalanceGhs(row.original);
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
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => <SaleStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Sales"
        sub="Agreements with buyers, payments and balances"
      />

      {pristine ? (
        <RegisterEmpty
          filtered={false}
          noun="sales"
          description="Draft your first sale to start tracking agreements and balances."
          actionLabel={canManage ? "Draft your first sale" : undefined}
          onAction={canManage ? () => router.push(`${LIST}/new`) : undefined}
        />
      ) : (
        <>
          <SalesStats />

          {isError && !search && activeFilterCount === 0 ? null : (
            <ConsoleFilterBar
              search={searchInput}
              onSearch={setSearch}
              searchPlaceholder="Search buyer…"
              activeCount={activeFilterCount}
              onClear={resetFilters}
              totalCount={totalCount}
              noun="sales"
              action={
                canManage ? (
                  <AdminButton asChild aria-label="New sale">
                    <Link href={`${LIST}/new`}>
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span className="hidden sm:inline">New sale</span>
                    </Link>
                  </AdminButton>
                ) : null
              }
              chips={
                <>
                  {status !== "all" ? (
                    <FilterChip onRemove={() => setFilter("status", "all")}>
                      Status: {labelOf(SALE_STATUS_FILTER_OPTIONS, status)}
                    </FilterChip>
                  ) : null}
                  {outstanding === "yes" ? (
                    <FilterChip onRemove={() => setFilter("outstanding", "no")}>
                      Balance: {labelOf(OUTSTANDING_OPTIONS, outstanding)}
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
                options={SALE_STATUS_FILTER_OPTIONS}
                active={status !== "all"}
              />
              <ConsoleLabeledSelect
                hint="Narrows to orders a buyer still owes money on, so you can chase only those."
                label="Balance"
                value={outstanding}
                onChange={(v) => setFilter("outstanding", v)}
                options={OUTSTANDING_OPTIONS}
                active={outstanding === "yes"}
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
                          saleIsPaidInFull(s) ? "text-console" : "text-console-red",
                        )}
                      >
                        {saleIsPaidInFull(s) ? (
                          "Paid in full"
                        ) : (
                          <Money value={saleBalanceGhs(s)} />
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
