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
import { useGetLandAcquisitionsQuery } from "@/redux/land/land-acquisitions-api";
import type {
  ILandAcquisition,
  ILandAcquisitionListQuery,
  LandAcquisitionStatus,
} from "@/types/land.types";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { DateTimeCell } from "@/components/admin/date-cell";
import { Money } from "@/components/admin/trading/sale-bits";
import {
  LAND_ACQUISITION_STATUS_FILTER_OPTIONS,
  LandAcquisitionStatusBadge,
} from "./land-acquisition-bits";

const LIST = "/admin/land-acquisitions";
const FILTER_DEFAULTS = {
  status: "all",
  outstanding: "all",
  from: "",
  to: "",
  size: "10",
};

export function LandAcquisitionsRegister() {
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

  const { status, outstanding, from, to } = filters;
  const pageSize = Number(filters.size) || 10;

  const queryArgs = useMemo<ILandAcquisitionListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(status !== "all" ? { status: status as LandAcquisitionStatus } : {}),
      ...(outstanding === "yes" ? { outstanding: true } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, status, outstanding, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetLandAcquisitionsQuery(queryArgs);
  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const activeFilterCount =
    (status !== "all" ? 1 : 0) +
    (outstanding !== "all" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);
  const filtered = activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && rows.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<ILandAcquisition, unknown>[]>(
    () => [
      {
        id: "acquisition",
        header: "Plot / seller",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <div className="min-w-0 @2xl/table:max-w-[90%]">
            <Mono className="font-semibold text-console">
              {row.original.reference}
            </Mono>
            <div className="[overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-muted">
              {/* The row navigates to the acquisition, so the seller has to
                  stop the click reaching it. */}
              <Link
                className={adminLinkClass}
                href={`/admin/land-sellers/${row.original.seller.id}`}
                onClick={(e) => e.stopPropagation()}
              >
                {row.original.seller.name}
              </Link>{" "}
              · {row.original.locationText}
            </div>
          </div>
        ),
      },
      {
        id: "agreed",
        header: columnHelp(
          "Agreed cost",
          "The price you settled with the seller for this land, before anything was paid.",
        ),
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-ink">
            <Money value={row.original.agreedCostGhs} />
          </Mono>
        ),
      },
      {
        id: "balance",
        header: columnHelp(
          "Balance",
          "What you still owe the seller on this land after the payments made so far.",
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
        cell: ({ row }) => (
          <LandAcquisitionStatusBadge status={row.original.status} />
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Land acquisitions
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Plots bought from sellers, their part-payments and balances
          </p>
        </div>
        {<AdminButton asChild>
              <Link href={`${LIST}/new`}>+ New acquisition</Link>
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
            options={LAND_ACQUISITION_STATUS_FILTER_OPTIONS}
            active={status !== "all"}
            className="lg:w-[160px]"
          />
          <ConsoleLabeledSelect
            label="Balance"
            value={outstanding}
            onChange={(v) => setFilter("outstanding", v)}
            options={[
              { label: "All", value: "all" },
              { label: "Outstanding", value: "yes" },
            ]}
            active={outstanding !== "all"}
            className="lg:w-[150px]"
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
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="acquisitions"
          description="Record a plot you are buying from a seller to start tracking it."
          actionLabel="New acquisition"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={resetFilters}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ILandAcquisition>
            columns={columns}
            data={rows}
            itemNoun="acquisitions"
            serverPagination={{
              totalCount: total,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(a) => `${LIST}/${a.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
