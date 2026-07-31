"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminButton, AdminPageHeader, Mono } from "@/components/admin/ui";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetDisbursementsQuery } from "@/redux/disbursements/disbursements-api";
import type {
  DisbursementRail,
  DisbursementStatus,
  IDisbursement,
  IDisbursementListQuery,
} from "@/types/disbursement.types";
import {
  DisbursementStatusBadge,
  Money,
  RAIL_FILTER_OPTIONS,
  RAIL_LABEL,
  STATUS_FILTER_OPTIONS,
  recipientLine,
} from "./disbursement-bits";
import { SendMoneyDialog } from "./send-money-dialog";

const LIST = "/admin/disbursements";

const ATTENTION_FILTER_OPTIONS = [
  { label: "All sends", value: "all" },
  { label: "Needs checking", value: "yes" },
];

const FILTER_DEFAULTS = {
  attention: "all",
  rail: "all",
  size: "10",
  status: "all",
};

/**
 * Every payout the business has made, whoever made it. Owner-only: staff see
 * their own sends on their own screen, and the whole register is a different
 * question from "what have I sent".
 */
export function DisbursementsScreen() {
  const {
    filters,
    page,
    queryParams,
    resetFilters,
    search,
    setFilter,
    setPage,
    setSearch,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });
  const [sending, setSending] = useState(false);

  const limit = Number(filters.size);
  const args: IDisbursementListQuery = {
    limit,
    page,
    ...(queryParams.search ? { search: String(queryParams.search) } : {}),
    ...(filters.status !== "all"
      ? { status: filters.status as DisbursementStatus }
      : {}),
    ...(filters.rail !== "all" ? { rail: filters.rail as DisbursementRail } : {}),
    // Only ever narrowed TO the ones needing a human - "everything that does
    // not need checking" is not a question anybody asks.
    ...(filters.attention === "yes" ? { needsAttention: true } : {}),
  };
  const { data, error, isFetching, isLoading, refetch } =
    useGetDisbursementsQuery(args);

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const activeFilterCount = (
    ["attention", "rail", "status"] as const
  ).filter((k) => filters[k] !== "all").length;

  // Explicit id + accessorFn, not the `accessorKey` shorthand: the mobile
  // card renderer tells a DATA row from a trailing ACTION by looking for
  // `columnDef.accessorFn`, and the shorthand leaves it undefined.
  const columns = useMemo<ColumnDef<IDisbursement, unknown>[]>(
    () => [
      {
        id: "reference",
        accessorFn: (d) => d.transactionNo,
        header: "Reference",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <Mono>{row.original.transactionNo}</Mono>,
      },
      {
        id: "recipient",
        accessorFn: (d) => d.recipientName,
        header: "Recipient",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="block min-w-0 text-left">
            <span className="block truncate font-medium text-ink">
              {row.original.recipientName}
            </span>
            <span className="font-adminmono block truncate text-[11.5px] text-soil/70">
              {recipientLine(row.original)}
            </span>
          </span>
        ),
      },
      {
        id: "rail",
        accessorFn: (d) => RAIL_LABEL[d.rail],
        header: "Rail",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
      },
      {
        id: "amount",
        accessorFn: (d) => d.amountGhs,
        header: "Amount",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <Money value={row.original.amountGhs} />,
      },
      {
        id: "paidFrom",
        // Null means the owner sent it straight from the company account
        // rather than out of anybody's allocation.
        accessorFn: (d) => d.holder?.name ?? "Company account",
        header: "Paid from",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
      },
      {
        id: "status",
        accessorFn: (d) => d.status,
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <DisbursementStatusBadge
            needsAttention={row.original.needsAttention}
            status={row.original.status}
          />
        ),
      },
      {
        id: "sent",
        accessorFn: (d) => d.createdAt,
        header: "Sent",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
    ],
    [],
  );

  if (isLoading) return <ConsoleTableSkeleton />;
  if (error) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  // A register nobody has used yet gets the empty state alone - no stats
  // strip and no filter bar to narrow nothing down.
  const pristine =
    total === 0 && !queryParams.search && filters.status === "all" &&
    filters.rail === "all" && filters.attention === "all";

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Money sent"
        sub="Every payout made through Hubtel, by the owner, staff or an agent in the field"
        actions={
          <AdminButton onClick={() => setSending(true)} type="button">
            Send money
          </AdminButton>
        }
      />

      {pristine ? (
        <EmptyState
          title="No money has been sent yet"
          description="Payouts made through Hubtel appear here, with what Hubtel said about each one."
        />
      ) : (
        <>
          <ConsoleFilterBar
            activeCount={activeFilterCount}
            onClear={resetFilters}
            onSearch={setSearch}
            search={search}
            searchPlaceholder="Reference, recipient, number…"
          >
            <ConsoleLabeledSelect
              active={filters.status !== "all"}
              label="Status"
              onChange={(v) => setFilter("status", v)}
              options={STATUS_FILTER_OPTIONS}
              value={filters.status}
            />
            <ConsoleLabeledSelect
              active={filters.rail !== "all"}
              label="Rail"
              onChange={(v) => setFilter("rail", v)}
              options={RAIL_FILTER_OPTIONS}
              value={filters.rail}
            />
            <ConsoleLabeledSelect
              active={filters.attention !== "all"}
              label="Attention"
              onChange={(v) => setFilter("attention", v)}
              options={ATTENTION_FILTER_OPTIONS}
              value={filters.attention}
            />
          </ConsoleFilterBar>

          <ConsoleDataTable<IDisbursement>
            columns={columns}
            data={rows}
            emptyState={
              <EmptyState
                title="Nothing matches"
                description="Try a different status, rail or search term."
              />
            }
            isFetching={isFetching}
        isFiltered={activeFilterCount > 0 || Boolean(queryParams.search)}
            itemNoun="payouts"
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
            rowHref={(row) => `${LIST}/${row.id}`}
            serverPagination={{
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
              page,
              pageSize: limit,
              totalCount: total,
            }}
          />
        </>
      )}

      <SendMoneyDialog
        onClose={() => setSending(false)}
        open={sending}
        surface="company"
      />
    </div>
  );
}
