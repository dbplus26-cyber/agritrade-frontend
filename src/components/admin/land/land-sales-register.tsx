"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { adminLinkClass, AdminButton, AdminCard, Mono } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import { useGetLandSalesQuery } from "@/redux/land/land-sales-api";
import type { ILandSale, ILandSaleListQuery, LandSaleStatus } from "@/types/land.types";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { DateTimeCell } from "@/components/admin/date-cell";
import { Money } from "@/components/admin/trading/sale-bits";
import {
  LAND_SALE_STATUS_FILTER_OPTIONS,
  LandSaleStatusBadge,
} from "./land-bits";

const LIST = "/admin/land-sales";
const FILTER_DEFAULTS = { status: "all", from: "", to: "", size: "10" };

export function LandSalesRegister() {
  const router = useRouter();
  const {
    page,
    filters,
    setFilter,
    setPage,
    resetFilters,
    search: searchInput,
    setSearch,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const { status, from, to } = filters;
  const pageSize = Number(filters.size) || 10;

  const queryArgs = useMemo<ILandSaleListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(status !== "all" ? { status: status as LandSaleStatus } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, status, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetLandSalesQuery(queryArgs);
  const sales = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const filtered = activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && sales.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<ILandSale, unknown>[]>(
    () => [
      {
        id: "plot",
        header: "Plot",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        // Real anchor - keyboard, middle-click and open-in-new-tab.
        cell: ({ row }) => (
          <Link
            href={`/admin/land-sales/${row.original.id}`}
            className="block min-w-0 @2xl/table:max-w-[90%] outline-none focus-visible:underline"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <Mono className="font-semibold text-console">
              {row.original.plot.reference}
            </Mono>
            <div className="[overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-muted">
              {row.original.plot.locationText}
            </div>
          </Link>
        ),
      },
      {
        id: "buyer",
        header: "Buyer",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        // The row navigates to the sale, so the buyer stops the click first.
        cell: ({ row }) => (
          <Link
            className={cn(adminLinkClass, "block min-w-0 [overflow-wrap:anywhere] @2xl/table:truncate")}
            href={`/admin/buyers/${row.original.buyer.id}`}
            onClick={(e) => e.stopPropagation()}
            title={row.original.buyer.name}
          >
            {row.original.buyer.name}
          </Link>
        ),
      },
      {
        id: "agreed",
        header: columnHelp(
          "Agreed",
          "The price the buyer agreed to pay for the plot, before anything was paid.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            <Money value={row.original.agreedPriceGhs} />
          </Mono>
        ),
      },
      {
        id: "balance",
        header: columnHelp(
          "Balance",
          "What the buyer still owes you on this plot after the payments made so far.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const b = row.original.balanceGhs;
          return (
            <Mono
              className={cn(
                "whitespace-nowrap font-semibold",
                b === 0 ? "text-console" : "text-console-red",
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
        cell: ({ row }) => <LandSaleStatusBadge status={row.original.status} />,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Land sales
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Plots sold to buyers, their part-payments and what is still owed
          </p>
        </div>
        {<AdminButton asChild>
              <Link href={`${LIST}/new`}>+ New land sale</Link>
            </AdminButton>}
      </div>

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          hideSearch
          activeCount={activeFilterCount}
          onClear={resetFilters}
        >
          <ConsoleLabeledSelect
            label="Status"
            value={status}
            onChange={(v) => setFilter("status", v)}
            options={LAND_SALE_STATUS_FILTER_OPTIONS}
            active={status !== "all"}
            className="lg:w-[160px]"
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
        <ConsoleTableSkeleton columns={6} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : sales.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="land sales"
          description="Draft a land sale from an available plot to start tracking it."
          actionLabel="New land sale"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={resetFilters}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ILandSale>
            columns={columns}
            data={sales}
            itemNoun="land sales"
            serverPagination={{
              totalCount: total,
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
