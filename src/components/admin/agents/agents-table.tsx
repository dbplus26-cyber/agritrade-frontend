"use client";

import { useMemo } from "react";

import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
import { DateTimeCell } from "@/components/admin/date-cell";
import { RegistryAvatar } from "@/components/admin/registry/supplier-screens";

const LIST = "/admin/agents";
const FILTER_DEFAULTS = { status: "all", size: "10" };

/** Signed GH₵ balance; a negative float (agent fronting cash) is flagged. */
export function BalanceCell({ amount }: { amount: number | null }) {
  return (
    <Mono
      className={cn(
        "whitespace-nowrap",
        amount === null && "text-adm-faint",
        amount !== null && amount < 0 && "font-semibold text-console-red",
        amount !== null && amount >= 0 && "text-adm-ink",
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state - a filter bar filters nothing.
  const pristine = !isLoading && !isError && agents.length === 0 && !filtered;

  const showMoney = useMoneyVisibility();
  const columns = useMemo<ColumnDef<IAgentSummary, unknown>[]>(() => {
    const all: ColumnDef<IAgentSummary, unknown>[] = [
      {
        id: "agent",
        accessorFn: (a) => `${a.firstName} ${a.lastName}`,
        header: "Agent",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <Link
              href={`${LIST}/${a.userId}`}
              className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <RegistryAvatar
                name={`${a.firstName} ${a.lastName}`}
                photoUrl={a.profilePicture}
              />
              <span className="block min-w-0 max-w-[85%]">
                <span className="block truncate font-medium text-adm-ink">
                  {a.firstName} {a.lastName}
                </span>
                <span className="block truncate text-[12.5px] text-adm-faint">
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
        header: columnHelp(
          "Float balance",
          "Company money still in this agent's hands: what you gave them, less what they have spent.",
        ),
        enableSorting: false,
        meta: columnMeta(),
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
            <Mono className="whitespace-nowrap text-adm-muted">
              {row.original.phone}
            </Mono>
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (a) => a.createdAt,
        header: "Added",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
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
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Agents &amp; Floats
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Field buyers and the cash in their hands - balances derive from the
          ledger, never a stored number
        </p>
      </div>

      {pristine || (isError && !filtered) ? null : (
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
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : agents.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="agents"
          description="Create a user with the AGENT role in Users - they appear here with their float."
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
