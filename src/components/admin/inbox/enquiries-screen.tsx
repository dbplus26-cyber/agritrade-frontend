"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, AdminPageHeader, Mono } from "@/components/admin/ui";
import { DateTimeCell } from "@/components/admin/date-cell";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
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
      <InboxStatTile label="Total" value={stats?.total} />
      <InboxStatTile label="New" value={stats?.new} />
      <InboxStatTile label="In progress" value={stats?.inProgress} />
      <InboxStatTile label="Resolved" value={stats?.resolved} />
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
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="block min-w-0">
            <span className="block truncate font-medium text-ink">
              {row.original.fullName}
            </span>
            <Mono className="block text-[11px] text-soil/70">
              {row.original.reference}
            </Mono>
          </span>
        ),
      },
      {
        id: "phone",
        accessorFn: (e) => e.phone,
        header: "Phone",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Mono className="whitespace-nowrap text-[12.5px] text-soil">
            {row.original.phone}
          </Mono>
        ),
      },
      {
        id: "subject",
        accessorFn: (e) => e.subject,
        header: "Subject",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="block max-w-[220px] truncate text-soil">
            {row.original.subject}
          </span>
        ),
      },
      {
        id: "status",
        accessorFn: (e) => e.status,
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <EnquiryStatusBadge status={row.original.status} />,
      },
      {
        id: "received",
        accessorFn: (e) => e.receivedAt,
        header: "Received",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => <DateTimeCell value={row.original.receivedAt} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Enquiries"
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
            >
              <ConsoleLabeledSelect
                label="Status"
                value={statusFilter}
                onChange={(v) => {
                  setFilter("status", v);
                }}
                options={STATUS_OPTIONS}
                active={statusFilter !== "all"}
                className="lg:w-[160px]"
              />
              <ConsoleDateField
                label="From"
                value={filters.from}
                onChange={(v) => {
                  setFilter("from", v);
                }}
                max={filters.to || undefined}
                className="lg:w-[150px]"
              />
              <ConsoleDateField
                label="To"
                value={filters.to}
                onChange={(v) => {
                  setFilter("to", v);
                }}
                min={filters.from || undefined}
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
                rowClassName={() => "h-12 hover:bg-surface-alt/60"}
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
