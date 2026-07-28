"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, Mono, ToneBadge, type Tone } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetAuditLogsQuery } from "@/redux/audit/audit-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import type { IAuditListQuery, IAuditLog } from "@/types/audit.types";

const CATEGORY_OPTIONS = [
  { value: "all", label: "All activity" },
  { value: "auth.", label: "Authentication" },
  { value: "user.", label: "User management" },
] as const;

/** Stable defaults for the URL-synced table state (module const on purpose). */
const FILTER_DEFAULTS = { category: "all", from: "", to: "", size: "20" };

/** Tone by outcome: failures/blocks read loud, recoveries calm, the rest neutral. */
const actionTone = (action: string): Tone => {
  if (/failed|blocked|reuse_detected/.test(action)) return "alert";
  if (/locked/.test(action)) return "harvest";
  if (/unblocked|activated|succeeded|created/.test(action)) return "leaf";
  if (/deleted|deactivated/.test(action)) return "slate";
  return "forest";
};

/** "auth.login_failed" → "Login failed" (the register shows plain language). */
const actionLabel = (action: string): string => {
  const tail = action.split(".").slice(1).join(".") || action;
  const words = tail.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const columnMeta = (opts?: { wide?: boolean }) => ({
  className: cn(
    "px-4 py-0 text-[13px]",
    opts?.wide ? "hidden xl:table-cell" : "table-cell",
  ),
  headerClassName:
    "h-[38px] whitespace-nowrap bg-surface-alt/70 py-0 text-[10.5px] font-bold uppercase tracking-[0.09em] text-soil",
});

/**
 * The audit-log register (super-admin): server-driven like the users table —
 * the debounced search, the category facet, the date window, the page and
 * page size all travel to GET /admin/audit-logs, with URL sync + session
 * memory from useTableQuery. Read-only: rows are records, not links.
 */
export function AuditTable() {
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

  const pageSize = Number(filters.size) || 20;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IAuditListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(filters.category !== "all" ? { category: filters.category } : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, pageSize, search, filters.category, filters.from, filters.to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetAuditLogsQuery(queryArgs);
  const logs = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;

  const activeFilterCount =
    (filters.category !== "all" ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  const columns = useMemo<ColumnDef<IAuditLog, unknown>[]>(
    () => [
      {
        id: "time",
        header: "Time",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "actor",
        header: "Actor",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const actor = row.original.actor;
          if (!actor) {
            return <span className="text-soil/70">System</span>;
          }
          return (
            <div className="min-w-0 max-w-[220px]">
              <div className="truncate font-medium text-ink">
                {actor.name}
              </div>
              <div className="truncate text-[11.5px] text-soil/70">
                {actor.email}
              </div>
            </div>
          );
        },
      },
      {
        id: "action",
        header: "Action",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <ToneBadge tone={actionTone(row.original.action)}>
            {actionLabel(row.original.action)}
          </ToneBadge>
        ),
      },
      {
        id: "record",
        header: "Record",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <span className="text-soil">{row.original.entity}</span>
            {row.original.entityId ? (
              <Mono
                className="ml-1.5 text-[11px] text-soil/70"
                // Full id on hover; the cell shows a short handle.
              >
                <span title={row.original.entityId}>
                  {row.original.entityId.slice(0, 8)}
                </span>
              </Mono>
            ) : null}
          </div>
        ),
      },
      {
        id: "ip",
        header: "IP",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12px] text-soil">
            {row.original.ip ?? "—"}
          </Mono>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Audit Log
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Every change, by whom, from where
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search actor or action…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
        >
          <ConsoleLabeledSelect
            label="Category"
            value={filters.category}
            onChange={(v) => setFilter("category", v)}
            options={CATEGORY_OPTIONS}
            active={filters.category !== "all"}
            className="lg:w-[170px]"
          />
          <ConsoleDateRange
            from={filters.from}
            to={filters.to}
            onFromChange={(v) => setFilter("from", v)}
            onToChange={(v) => setFilter("to", v)}
            fieldClassName="lg:w-[150px]"
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
      ) : logs.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching entries"
                : "Nothing on file yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination. Adjust the criteria or clear them."
                : "Every sign-in, account change and security event will be filed here as it happens."
            }
            {...(search || activeFilterCount > 0
              ? {
                  actionLabel: "Clear search & filters",
                  onAction: () => {
                    setSearch("");
                    resetFilters();
                  },
                }
              : {})}
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IAuditLog>
            columns={columns}
            data={logs}
            itemNoun="entries"
            isFetching={isFetching}
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
