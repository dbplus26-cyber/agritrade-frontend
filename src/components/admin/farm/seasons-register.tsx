"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { AdminButton, AdminCard } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import type { ISeason, ISeasonListQuery } from "@/types/farm.types";
import { ACTIVE_FILTER_OPTIONS, ActiveBadge } from "./farm-bits";

const LIST = "/admin/seasons";
const FILTER_DEFAULTS = { active: "all", size: "10" };

export function SeasonsRegister() {
  const router = useRouter();
  const {
    page,
    filters,
    setFilter,
    setPage,
    resetFilters,
    search: searchInput,
    setSearch,
    queryParams,
  } = useTableQuery({ defaults: FILTER_DEFAULTS });

  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";
  const { active } = filters;

  const queryArgs = useMemo<ISeasonListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(active !== "all" ? { isActive: active === "true" } : {}),
    }),
    [page, pageSize, search, active],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetSeasonsQuery(queryArgs);
  const seasons = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = active !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<ISeason, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Season",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        // Real anchor - keyboard, middle-click and open-in-new-tab.
        cell: ({ row }) => (
          <Link
            href={`/admin/seasons/${row.original.id}`}
            className="block max-w-[90%] truncate font-semibold text-adm-ink outline-none focus-visible:underline"
            onClick={(e) => { e.stopPropagation(); }}
            title={row.original.name}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "starts",
        header: "Starts",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <DateOnlyCell value={row.original.startsOn} />,
      },
      {
        id: "ends",
        header: "Ends",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => <DateOnlyCell value={row.original.endsOn} />,
      },
      {
        id: "added",
        accessorFn: (s) => s.createdAt,
        header: "Added",
        enableSorting: false,
        meta: columnMeta({ at: "2xl" }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <ActiveBadge active={row.original.isActive} />,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Seasons
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Farming seasons that grants and repayments are booked against
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search season…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <AdminButton asChild>
              <Link href={`${LIST}/new`}>+ New season</Link>
            </AdminButton>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={active}
            onChange={(v) => setFilter("active", v)}
            options={ACTIVE_FILTER_OPTIONS}
            active={active !== "all"}
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
      ) : seasons.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching seasons"
                : "No seasons yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination."
                : "Create the first season to start booking grants."
            }
            actionLabel={
              search || activeFilterCount > 0 ? undefined : "New season"
            }
            onAction={
              search || activeFilterCount > 0
                ? undefined
                : () => router.push(`${LIST}/new`)
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ISeason>
            columns={columns}
            data={seasons}
            itemNoun="seasons"
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(s) => `${LIST}/${s.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
