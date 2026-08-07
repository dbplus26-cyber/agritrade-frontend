"use client";

import Link from "next/link";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { AdminCard, AdminPageHeader, Mono } from "@/components/admin/ui";
import { DateTimeCell } from "@/components/admin/date-cell";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import {
  useGetFarmApplicationStatsQuery,
  useGetFarmApplicationsQuery,
} from "@/redux/farm-applications/farm-applications-api";
import {
  FARM_APPLICATION_STATUSES,
  type FarmApplicationStatus,
  type IAdminFarmApplication,
  type IFarmApplicationListQuery,
} from "@/types/inbox.types";
import { Absent, columnMeta } from "@/components/admin/registry/registry-bits";
import {
  FARM_APPLICATION_STATUS_META,
  FarmApplicationStatusBadge,
  InboxStatTile,
} from "./inbox-bits";

const LIST = "/admin/farm-applications";
const FILTER_DEFAULTS = { status: "all", size: "10" };

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  ...FARM_APPLICATION_STATUSES.map((s) => ({
    value: s,
    label: FARM_APPLICATION_STATUS_META[s].label,
  })),
];

function FarmApplicationStats() {
  const { data } = useGetFarmApplicationStatsQuery();
  const stats = data?.data;
  return (
    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      <InboxStatTile
        label="Total"
        hint="Everyone who has ever applied to join the outgrower scheme."
        value={stats?.total}
      />
      <InboxStatTile
        label="New"
        hint="Applicants nobody has looked at yet."
        value={stats?.new}
      />
      <InboxStatTile
        label="Reviewing"
        hint="Applicants somebody is checking, with no decision made yet."
        value={stats?.reviewing}
      />
      <InboxStatTile
        label="Approved"
        hint="Applicants accepted into the scheme but not yet set up as farmers here."
        value={stats?.approved}
      />
      <InboxStatTile
        label="Rejected"
        hint="Applicants turned down for the scheme."
        value={stats?.rejected}
      />
      <InboxStatTile
        label="Converted"
        hint="Applicants now signed up as farmers, with their own record for grants and repayments."
        value={stats?.converted}
      />
    </div>
  );
}

/** /admin/farm-applications - the farming-programme application queue. */
export function FarmApplicationsScreen() {
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

  const queryArgs = useMemo<IFarmApplicationListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(statusFilter !== "all"
        ? { status: statusFilter as FarmApplicationStatus }
        : {}),
    }),
    [page, pageSize, search, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetFarmApplicationsQuery(queryArgs);
  const applications = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;
  // An inbox with nothing on file and nothing narrowing it shows ONLY the
  // empty state - stat tiles and a filter bar over zero rows serve nothing.
  const pristine =
    !isLoading &&
    !isError &&
    applications.length === 0 &&
    !search &&
    activeFilterCount === 0;

  const columns = useMemo<ColumnDef<IAdminFarmApplication, unknown>[]>(
    () => [
      {
        id: "applicant",
        accessorFn: (a) => `${a.name} ${a.reference}`,
        header: "Applicant",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        // A real anchor, as every other register's identity column has: the
        // row's own click handler gives no keyboard target, no middle-click
        // and nothing to copy a link from. Ink, not green - see adminLinkClass
        // on why a whole identity column does not go green.
        cell: ({ row }) => (
          <Link
            className="block min-w-0 max-w-[90%] outline-none focus-visible:underline"
            href={`${LIST}/${row.original.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="block truncate font-medium text-adm-ink">
              {row.original.name}
            </span>
            <Mono className="block text-[12.5px] text-adm-faint">
              {row.original.reference}
            </Mono>
          </Link>
        ),
      },
      {
        id: "phone",
        accessorFn: (a) => a.phone,
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
        id: "community",
        accessorFn: (a) => a.community ?? "",
        header: "Community",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.community ? (
            <span className="block max-w-[160px] truncate text-adm-muted">
              {row.original.community}
            </span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "farmSize",
        accessorFn: (a) => a.farmSizeAcres ?? "",
        header: "Farm size",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.farmSizeAcres !== null ? (
            <Mono className="whitespace-nowrap text-adm-muted">
              {row.original.farmSizeAcres} acres
            </Mono>
          ) : (
            <Absent />
          ),
      },
      {
        id: "status",
        accessorFn: (a) => a.status,
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <FarmApplicationStatusBadge status={row.original.status} />
        ),
      },
      {
        id: "received",
        accessorFn: (a) => a.createdAt,
        header: "Received",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Farm applications"
        hint="Farmers applying to join the outgrower scheme."
        sub="People applying to join the farming programme through the website"
      />

      {pristine ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No applications yet"
            description="Applications submitted on the website land here for review."
          />
        </AdminCard>
      ) : (
        <>
          <FarmApplicationStats />

          {isError && !search && activeFilterCount === 0 ? null : (
            <ConsoleFilterBar
              search={searchInput}
              onSearch={setSearch}
              searchPlaceholder="Search name, phone, community…"
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
              <ConsoleDataTable<IAdminFarmApplication>
                columns={columns}
                data={applications}
                itemNoun="applications"
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
                rowHref={(a) => `${LIST}/${a.id}`}
                rowClassName={() => "h-12 hover:bg-adm-sunken"}
                emptyState={
                  // The pristine empty inbox renders outside the table above -
                  // reaching this means a search or filter is narrowing the view.
                  <EmptyState
                    variant="plain"
                    title="No matching applications"
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
