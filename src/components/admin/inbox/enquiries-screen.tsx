"use client";

import Link from "next/link";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { AdminCard, AdminPageHeader, Mono } from "@/components/admin/ui";
import { DateTimeCell } from "@/components/admin/date-cell";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import {
  useGetEnquiriesQuery,
  useGetEnquiryStatsQuery,
} from "@/redux/enquiries/enquiries-api";
import {
  ENQUIRY_STATUSES,
  type EnquiryStatus,
  type IAdminEnquiry,
  type IEnquiryListQuery,
} from "@/types/inbox.types";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import {
  ENQUIRY_STATUS_META,
  EnquiryStatusBadge,
  InboxStatTile,
} from "./inbox-bits";

const LIST = "/admin/enquiries";
const FILTER_DEFAULTS = { status: "all", from: "", to: "", size: "10" };

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...ENQUIRY_STATUSES.map((s) => ({
    value: s,
    label: ENQUIRY_STATUS_META[s].label,
  })),
];

function EnquiryStats() {
  const { data } = useGetEnquiryStatsQuery();
  const stats = data?.data;
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <InboxStatTile
        label="Total"
        hint="Every message the website contact form has ever sent you."
        value={stats?.total}
      />
      <InboxStatTile
        label="New"
        hint="Messages nobody has picked up yet."
        value={stats?.new}
      />
      <InboxStatTile
        label="In progress"
        hint="Messages somebody is dealing with but has not finished."
        value={stats?.inProgress}
      />
      <InboxStatTile
        label="Resolved"
        hint="Messages that have been answered and closed off."
        value={stats?.resolved}
      />
    </div>
  );
}

/** /admin/enquiries - the website contact-form queue. */
export function EnquiriesScreen() {
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

  const statusFilter = filters.status;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IEnquiryListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(statusFilter !== "all"
        ? { status: statusFilter as EnquiryStatus }
        : {}),
      ...(filters.from ? { from: filters.from } : {}),
      ...(filters.to ? { to: filters.to } : {}),
    }),
    [page, pageSize, search, statusFilter, filters.from, filters.to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetEnquiriesQuery(queryArgs);
  const enquiries = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);
  // An inbox with nothing on file and nothing narrowing it shows ONLY the
  // empty state - stat tiles and a filter bar over zero rows serve nothing.
  const pristine =
    !isLoading &&
    !isError &&
    enquiries.length === 0 &&
    !search &&
    activeFilterCount === 0;

  const columns = useMemo<ColumnDef<IAdminEnquiry, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (e) => `${e.fullName} ${e.reference}`,
        header: "Name",
        enableSorting: false,
        meta: columnMeta({ card: "title" }),
        // A real anchor, as every other register's identity column has: the
        // row's own click handler gives no keyboard target, no middle-click
        // and nothing to copy a link from. Ink, not green - see adminLinkClass
        // on why a whole identity column does not go green.
        cell: ({ row }) => (
          <Link
            className="block @2xl/table:min-w-[8rem] @2xl/table:max-w-[20rem] outline-none focus-visible:underline"
            href={`${LIST}/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
              {row.original.fullName}
            </span>
            <Mono className="block text-[12.5px] text-adm-faint">
              {row.original.reference}
            </Mono>
          </Link>
        ),
      },
      {
        id: "phone",
        accessorFn: (e) => e.phone,
        header: "Phone",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-adm-muted">
            {row.original.phone}
          </Mono>
        ),
      },
      {
        id: "subject",
        accessorFn: (e) => e.subject,
        header: "Subject",
        enableSorting: false,
        meta: columnMeta({ card: "meta", stretch: true }),
        cell: ({ row }) => (
          <span className="block @2xl/table:max-w-[90%] [overflow-wrap:anywhere] @2xl/table:truncate text-adm-muted">
            {row.original.subject}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (e) => e.status,
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => <EnquiryStatusBadge status={row.original.status} />,
      },
      {
        id: "received",
        accessorFn: (e) => e.receivedAt,
        header: "Received",
        enableSorting: false,
        meta: columnMeta({ card: "meta", wide: true }),
        cell: ({ row }) => <DateTimeCell value={row.original.receivedAt} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Enquiries"
        hint="Messages sent through the public website."
        sub="Messages sent through the website contact form"
      />

      {pristine ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No enquiries yet"
            description="Messages sent through the website contact form land here."
          />
        </AdminCard>
      ) : (
        <>
          <EnquiryStats />

          {isError && !search && activeFilterCount === 0 ? null : (
            <ConsoleFilterBar
              search={searchInput}
              onSearch={setSearch}
              searchPlaceholder="Search name, phone, message…"
              activeCount={activeFilterCount}
              onClear={resetFilters}
              totalCount={totalCount}
              noun="enquiries"
              chips={
                <>
                  {statusFilter !== "all" ? (
                    <FilterChip onRemove={() => setFilter("status", "all")}>
                      Status: {labelOf(STATUS_OPTIONS, statusFilter)}
                    </FilterChip>
                  ) : null}
                  {filters.from ? (
                    <FilterChip onRemove={() => setFilter("from", "")}>
                      From: {filters.from}
                    </FilterChip>
                  ) : null}
                  {filters.to ? (
                    <FilterChip onRemove={() => setFilter("to", "")}>
                      To: {filters.to}
                    </FilterChip>
                  ) : null}
                </>
              }
            >
              <ConsoleLabeledSelect
                label="Status"
                value={statusFilter}
                onChange={(v) => {
                  setFilter("status", v);
                }}
                options={STATUS_OPTIONS}
                active={statusFilter !== "all"}
              />
              <ConsoleDateRange
                from={filters.from}
                to={filters.to}
                onFromChange={(v) => {
                  setFilter("from", v);
                }}
                onToChange={(v) => {
                  setFilter("to", v);
                }}
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
          ) : (
            <AdminCard className="overflow-hidden">
              <ConsoleDataTable<IAdminEnquiry>
                columns={columns}
                data={enquiries}
                itemNoun="enquiries"
                isFetching={isFetching}
                serverPagination={{
                  totalCount,
                  page,
                  pageSize,
                  onPageChange: setPage,
                  onPageSizeChange: (size) => {
                    setFilter("size", String(size));
                  },
                }}
                rowHref={(e) => `${LIST}/${e.id}`}
                rowClassName={() => "h-12 hover:bg-adm-sunken"}
                emptyState={
                  // The pristine empty inbox renders outside the table above -
                  // reaching this means a search or filter is narrowing the view.
                  <EmptyState
                    variant="plain"
                    title="No matching enquiries"
                    description="Nothing matches this search and filter combination."
                    actionLabel="Clear search & filters"
                    onAction={() => {
                      setSearch("");
                      resetFilters();
                    }}
                  />
                }
              />
            </AdminCard>
          )}
        </>
      )}
    </div>
  );
}
