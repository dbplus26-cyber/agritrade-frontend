"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { AdminCard, Mono, ToneBadge } from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetRepaymentsQuery } from "@/redux/farm/repayments-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import type { IRepayment, IRepaymentListQuery } from "@/types/farm.types";
import { formatFarmDate } from "./farm-bits";

const LIST = "/admin/repayments";
const FILTER_DEFAULTS = { season: "all", from: "", to: "", size: "10" };

export function RepaymentsRegister() {
  const router = useRouter();
  const { page, filters, setFilter, setPage, resetFilters } = useTableQuery({
    defaults: FILTER_DEFAULTS,
  });

  const pageSize = Number(filters.size) || 10;
  const { season, from, to } = filters;
  const seasons = useGetSeasonsQuery({ limit: 100 });

  const queryArgs = useMemo<IRepaymentListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(season !== "all" ? { seasonId: season } : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, season, from, to],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetRepaymentsQuery(queryArgs);
  const repayments = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (season !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const seasonOptions = useMemo(
    () => [
      { label: "All seasons", value: "all" },
      ...(seasons.data?.data ?? []).map((s) => ({ label: s.name, value: s.id })),
    ],
    [seasons.data],
  );

  const columns = useMemo<ColumnDef<IRepayment, unknown>[]>(
    () => [
      {
        id: "farmer",
        header: "Farmer",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="truncate font-semibold text-ink">
              {row.original.farmer.name}
            </div>
            <div className="text-[12px] text-soil">
              {formatFarmDate(row.original.receivedAt)}
            </div>
          </div>
        ),
      },
      {
        id: "produce",
        header: "Produce",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <span className="text-[12.5px] text-ink">
            {row.original.commodity.name}
            <span className="text-soil"> · {row.original.weightKg} kg</span>
          </span>
        ),
      },
      {
        id: "season",
        header: "Season",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <span className="text-[12.5px] text-soil">
            {row.original.season.name}
          </span>
        ),
      },
      {
        id: "value",
        header: "Value",
        enableSorting: false,
        meta: columnMeta({ className: "text-right" }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-leaf">
            <Money value={row.original.valueGhs} />
          </Mono>
        ),
      },
      {
        id: "stock",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.intoStock ? (
            <ToneBadge tone="sky">Into stock</ToneBadge>
          ) : null,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Produce repayments
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Produce received against farmer grants, optionally taken into stock
        </p>
      </div>

      {isError && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Record repayment</Link>
            </Button>
          }
        >
          <ConsoleLabeledSelect
            label="Season"
            value={season}
            onChange={(v) => setFilter("season", v)}
            options={seasonOptions}
            active={season !== "all"}
            className="lg:w-[200px]"
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
      ) : repayments.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              activeFilterCount > 0 ? "No matching repayments" : "No repayments yet"
            }
            description={
              activeFilterCount > 0
                ? "Nothing matches this filter."
                : "Record produce received against a grant."
            }
            actionLabel={activeFilterCount > 0 ? undefined : "Record repayment"}
            onAction={
              activeFilterCount > 0 ? undefined : () => router.push(`${LIST}/new`)
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IRepayment>
            columns={columns}
            data={repayments}
            itemNoun="repayments"
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowClassName={() => "h-12"}
          />
        </AdminCard>
      )}
    </div>
  );
}
