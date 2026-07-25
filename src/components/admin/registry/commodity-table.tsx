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
import { AdminCard, Mono } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { useAuthRole } from "@/hooks/use-auth-role";
import { extractApiError } from "@/lib/extract-api-error";
import type { ICommodity, ICommodityListQuery } from "@/types/registry.types";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  PublishedBadge,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";

const PUBLISH_FILTER_OPTIONS = [
  { value: "all", label: "All visibility" },
  { value: "published", label: "On website" },
  { value: "unpublished", label: "Not published" },
] as const;

const FILTER_DEFAULTS = { status: "all", visibility: "all", size: "10" };

/** The live Commodities register - everything the business trades, managed
 * here and referenced by id from every future ledger. */
export function CommodityTable() {
  const router = useRouter();
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
  // Only the owner edits this vocabulary (design doc 4).
  const { isSuperAdmin } = useAuthRole();

  const statusFilter = filters.status as StatusFilter;
  const visibilityFilter = filters.visibility;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<ICommodityListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
      ...(visibilityFilter !== "all"
        ? { publishToWebsite: visibilityFilter === "published" }
        : {}),
    }),
    [page, pageSize, search, statusFilter, visibilityFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetCommoditiesQuery(queryArgs);
  const commodities = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;

  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (visibilityFilter !== "all" ? 1 : 0);

  const columns = useMemo<ColumnDef<ICommodity, unknown>[]>(
    () => [
      {
        id: "commodity",
        accessorFn: (c) => `${c.name} ${c.variety ?? ""}`,
        header: "Commodity",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const c = row.original;
          return (
            <Link
              href={`/admin/commodities/${c.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="inline-flex max-w-full min-w-0 items-center gap-2.5">
                {c.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- thumb
                  <img
                    src={c.photo}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 flex-none rounded-[4px] object-cover"
                  />
                ) : (
                  <span className="font-adminmono inline-flex h-7 w-7 flex-none items-center justify-center rounded-[4px] bg-console/10 text-[11px] font-bold text-console">
                    {c.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ink">
                    {c.name}
                  </span>
                  <span className="block truncate text-[11.5px] text-soil/70">
                    {c.variety ?? "No variety"}
                  </span>
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "grade",
        accessorFn: (c) => c.qualityGrade ?? "",
        header: "Grade",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.qualityGrade ? (
            <span className="whitespace-nowrap text-soil">
              {row.original.qualityGrade}
            </span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "bagWeight",
        accessorFn: (c) => c.bagWeightKg ?? "",
        header: "Bag",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.bagWeightKg !== null ? (
            <Mono className="whitespace-nowrap text-soil">
              {row.original.bagWeightKg} kg
            </Mono>
          ) : (
            <Absent />
          ),
      },
      {
        id: "website",
        header: "Website",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <PublishedBadge published={row.original.publishToWebsite} />
        ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Commodities
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Everything the business trades - varieties, grades and website
          visibility
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search commodity…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            isSuperAdmin ? (
              <Button
                asChild
                variant="harvest"
                className="h-8 px-3.5 text-[13px]"
              >
                <Link href="/admin/commodities/new">+ Add commodity</Link>
              </Button>
            ) : null
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_FILTER_OPTIONS}
            active={statusFilter !== "all"}
            className="lg:w-[150px]"
          />
          <ConsoleLabeledSelect
            label="Website"
            value={visibilityFilter}
            onChange={(v) => setFilter("visibility", v)}
            options={PUBLISH_FILTER_OPTIONS}
            active={visibilityFilter !== "all"}
            className="lg:w-[165px]"
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
      ) : commodities.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching commodities"
              description="Nothing matches this search and filter combination. Adjust the criteria or clear them."
              actionLabel="Clear search & filters"
              onAction={() => {
                setSearch("");
                resetFilters();
              }}
            />
          ) : (
            <EmptyState
              variant="plain"
              title="No commodities yet"
              description="Add the first commodity the business trades - name, variety and grade."
              actionLabel="Add your first commodity"
              onAction={() => router.push("/admin/commodities/new")}
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ICommodity>
            columns={columns}
            data={commodities}
            itemNoun="commodities"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(c) => `/admin/commodities/${c.id}`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}
