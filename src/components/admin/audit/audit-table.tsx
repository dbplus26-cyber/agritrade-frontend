"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
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
import { columnMeta } from "@/components/admin/registry/registry-bits";

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

// columnMeta lives in registry-bits and is shared by every register table.
// This file used to keep a private copy of it, which had already drifted -
// it never gained `at` or `className`, so the audit log could not express a
// breakpoint other than xl, and a stretch column was not expressible at all.

/**
 * The audit-log register (super-admin): server-driven like the users table -
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
        header: columnHelp(
          "Actor",
          "Who did it: the person signed in at the time, or the system itself.",
        ),
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const actor = row.original.actor;
          if (!actor) {
            return <span className="text-adm-faint">System</span>;
          }
          return (
            // Full values on hover, and full wrap in the card view: audit
            // rows have no detail page, so an ellipsis on touch would leave
            // the reader with no way to the rest of a name or email.
            <div className="min-w-0 w-full">
              <div
                className="max-w-[90%] font-medium text-adm-ink [overflow-wrap:anywhere] @2xl/table:truncate"
                title={actor.name}
              >
                {actor.name}
              </div>
              <div
                className="max-w-[90%] text-[12.5px] text-adm-faint [overflow-wrap:anywhere] @2xl/table:truncate"
                title={actor.email}
              >
                {actor.email}
              </div>
            </div>
          );
        },
      },
      {
        id: "action",
        header: columnHelp("Action", "What they did, in plain words."),
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
        header: columnHelp(
          "Record",
          "Which thing in the system was touched, and its reference.",
        ),
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <div className="whitespace-nowrap">
            <span className="text-adm-muted">{row.original.entity}</span>
            {row.original.entityId ? (
              <Mono
                className="ml-1.5 text-[11px] text-adm-faint"
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
        header: columnHelp(
          "IP",
          "The internet address they were connecting from, useful for spotting a sign-in from somewhere odd.",
        ),
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-muted">
            {row.original.ip ?? "-"}
          </Mono>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Audit Log
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
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
