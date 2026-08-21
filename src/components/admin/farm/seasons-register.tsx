"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
} from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && seasons.length === 0 && !filtered;

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
            className="block min-w-0 @2xl/table:max-w-[90%] [overflow-wrap:anywhere] @2xl/table:truncate font-semibold text-adm-ink outline-none focus-visible:underline"
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
      <AdminPageHeader
        title="Seasons"
        sub="Farming seasons that grants and repayments are booked against"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search season…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="seasons"
          action={
            <AdminButton asChild aria-label="New season">
              <Link href={`${LIST}/new`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New season</span>
              </Link>
            </AdminButton>
          }
          inlineFilter={
            <ConsoleLabeledSelect
              label="Status"
              value={active}
              onChange={(v) => setFilter("active", v)}
              options={ACTIVE_FILTER_OPTIONS}
              active={active !== "all"}
            />
          }
          chips={
            <>
              {active !== "all" ? (
                <FilterChip onRemove={() => setFilter("active", "all")}>
                  Status: {labelOf(ACTIVE_FILTER_OPTIONS, active)}
                </FilterChip>
              ) : null}
            </>
          }
        />
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : seasons.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="seasons"
          description="Create the first season to start booking grants."
          actionLabel="New season"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
