"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { DateTimeCell } from "@/components/admin/date-cell";
import {
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
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
        header: columnHelp(
          "Reference",
          "The number Hubtel gives this payout, so you can trace it with them.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <Mono>{row.original.transactionNo}</Mono>,
      },
      {
        id: "recipient",
        accessorFn: (d) => d.recipientName,
        header: "Recipient",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <span className="block w-full min-w-0 text-left">
            <span
              className="block @2xl/table:max-w-[90%] [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink"
              title={row.original.recipientName}
            >
              {row.original.recipientName}
            </span>
            <span className="font-adminmono block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
              {recipientLine(row.original)}
            </span>
          </span>
        ),
      },
      {
        id: "rail",
        accessorFn: (d) => RAIL_LABEL[d.rail],
        header: columnHelp(
          "Rail",
          "How the money travelled: mobile money to a phone number, or a transfer to a bank account.",
        ),
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
        header: columnHelp(
          "Paid from",
          "Whose money this came out of: one person's float, or the company account directly.",
        ),
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
    <div>
      <AdminPageHeader
        title="Money sent"
        hint="Every mobile money and bank transfer sent from the business."
        sub="Every payout made through Hubtel, by the owner, staff or an agent in the field"
      />

      {pristine ? (
        <RegisterEmpty
          filtered={false}
          noun="payouts"
          title="No money has been sent yet"
          description="Payouts made through Hubtel appear here, with what Hubtel said about each one."
          actionLabel="Send money"
          onAction={() => setSending(true)}
        />
      ) : (
        <>
          <ConsoleFilterBar
            activeCount={activeFilterCount}
            onClear={resetFilters}
            onSearch={setSearch}
            search={search}
            searchPlaceholder="Reference, recipient, number…"
            totalCount={total}
            noun="payouts"
            action={
              <AdminButton
                aria-label="Send money"
                onClick={() => setSending(true)}
                type="button"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Send money</span>
              </AdminButton>
            }
            chips={
              <>
                {filters.status !== "all" ? (
                  <FilterChip onRemove={() => setFilter("status", "all")}>
                    Status: {labelOf(STATUS_FILTER_OPTIONS, filters.status)}
                  </FilterChip>
                ) : null}
                {filters.rail !== "all" ? (
                  <FilterChip onRemove={() => setFilter("rail", "all")}>
                    Rail: {labelOf(RAIL_FILTER_OPTIONS, filters.rail)}
                  </FilterChip>
                ) : null}
                {filters.attention !== "all" ? (
                  <FilterChip onRemove={() => setFilter("attention", "all")}>
                    Attention:{" "}
                    {labelOf(ATTENTION_FILTER_OPTIONS, filters.attention)}
                  </FilterChip>
                ) : null}
              </>
            }
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
              hint="How the money travelled: mobile money to a phone, or a transfer to a bank account."
              label="Rail"
              onChange={(v) => setFilter("rail", v)}
              options={RAIL_FILTER_OPTIONS}
              value={filters.rail}
            />
            <ConsoleLabeledSelect
              active={filters.attention !== "all"}
              hint="Narrows to payments nobody has confirmed either way, which are the ones to chase."
              label="Attention"
              onChange={(v) => setFilter("attention", v)}
              options={ATTENTION_FILTER_OPTIONS}
              value={filters.attention}
            />
          </ConsoleFilterBar>

          {/* Every other register files its rows on an AdminCard, and the
              money surfaces are no exception: a bare table would leave them
              the only screens with no sheet under the rows. */}
          <AdminCard className="overflow-hidden">
            <ConsoleDataTable<IDisbursement>
              columns={columns}
              data={rows}
              emptyState={
                <EmptyState
                  variant="plain"
                  title="Nothing matches"
                  description="Try a different status, rail or search term."
                />
              }
              isFetching={isFetching}
              isFiltered={activeFilterCount > 0 || Boolean(queryParams.search)}
              itemNoun="payouts"
              rowClassName={() => "h-12 hover:bg-adm-sunken"}
              rowHref={(row) => `${LIST}/${row.id}`}
              serverPagination={{
                onPageChange: setPage,
                onPageSizeChange: (size) => setFilter("size", String(size)),
                page,
                pageSize: limit,
                totalCount: total,
              }}
            />
          </AdminCard>
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
