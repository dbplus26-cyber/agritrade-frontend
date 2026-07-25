"use client";

import { useMemo } from "react";

import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono } from "@/components/admin/ui";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetAgentsQuery } from "@/redux/agents/agents-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type { IAgentListQuery, IAgentSummary } from "@/types/agent.types";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "@/components/admin/registry/registry-bits";

const LIST = "/admin/agents";
const FILTER_DEFAULTS = { status: "all", size: "10" };

/** Signed GH₵ balance; a negative float (agent fronting cash) is flagged. */
export function BalanceCell({ amount }: { amount: number | null }) {
  return (
    <Mono
      className={cn(
        "whitespace-nowrap text-[12.5px]",
        amount === null && "text-soil/50",
        amount !== null && amount < 0 && "font-semibold text-error",
        amount !== null && amount >= 0 && "text-ink",
      )}
    >
      {formatCedis(amount)}
    </Mono>
  );
}

/** The field-agent register with live float balances. */
export function AgentsTable() {
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

  const statusFilter = filters.status as StatusFilter;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IAgentListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
    }),
    [page, pageSize, search, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAgentsQuery(queryArgs);
  const agents = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const showMoney = useMoneyVisibility();
  const columns = useMemo<ColumnDef<IAgentSummary, unknown>[]>(() => {
    const all: ColumnDef<IAgentSummary, unknown>[] = [
      {
        id: "agent",
        accessorFn: (a) => `${a.firstName} ${a.lastName}`,
        header: "Agent",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <Link
              href={`${LIST}/${a.userId}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {a.firstName} {a.lastName}
                </span>
                <span className="block truncate text-[11.5px] text-soil/70">
                  {a.region ?? a.email}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "balance",
        accessorFn: (a) => a.balanceGhs,
        header: "Float balance",
        enableSorting: false,
        meta: columnMeta({ className: "text-right" }),
        cell: ({ row }) => <BalanceCell amount={row.original.balanceGhs} />,
      },
      {
        id: "phone",
        accessorFn: (a) => a.phone ?? "",
        header: "Phone",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.phone ? (
            <Mono className="whitespace-nowrap text-[12.5px] text-soil">
              {row.original.phone}
            </Mono>
          ) : (
            <Absent />
          ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ];
    // The float balance is money: drop the column entirely rather than show a
    // column of "Hidden" (the API redacts the value regardless).
    if (showMoney) return all;
    return all.filter((c) => c.id !== "balance");
  }, [showMoney]);

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Agents &amp; Floats
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Field buyers and the cash in their hands - balances derive from the
          ledger, never a stored number
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search agent…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
        >
          <ConsoleLabeledSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_FILTER_OPTIONS}
            active={statusFilter !== "all"}
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
      ) : agents.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={search || activeFilterCount ? "No matching agents" : "No agents yet"}
            description={
              search || activeFilterCount
                ? "Nothing matches this search and filter combination."
                : "Create a user with the AGENT role in Users - they appear here with their float."
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IAgentSummary>
            columns={columns}
            data={agents}
            itemNoun="agents"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(a) => `${LIST}/${a.userId}`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}
