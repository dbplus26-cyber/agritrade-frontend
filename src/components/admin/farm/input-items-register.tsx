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
import { Absent, columnMeta } from "@/components/admin/registry/registry-bits";
import { TitleCell } from "@/components/admin/table-cells";
import { DateTimeCell } from "@/components/admin/date-cell";
import { AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetInputItemsQuery } from "@/redux/farm/input-items-api";
import type { IInputItem, IInputItemListQuery } from "@/types/farm.types";
import { ACTIVE_FILTER_OPTIONS, ActiveBadge } from "./farm-bits";

const LIST = "/admin/input-items";
const FILTER_DEFAULTS = { active: "all", size: "10" };

export function InputItemsRegister() {
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

  const queryArgs = useMemo<IInputItemListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(active !== "all" ? { isActive: active === "true" } : {}),
    }),
    [page, pageSize, search, active],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetInputItemsQuery(queryArgs);
  const items = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = active !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<IInputItem, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Item",
        enableSorting: false,
        meta: columnMeta(),
        // The description rides underneath rather than holding a column of
        // its own. Prose has no natural width, so given a column it is always
        // the one that pushes the table off the side of the screen; under the
        // name it is subordinate in the layout as well as the reading order.
        cell: ({ row }) => (
          <TitleCell
            href={`${LIST}/${row.original.id}/edit`}
            meta={row.original.description}
            title={row.original.name}
            width="wide"
          />
        ),
      },
      {
        id: "unit",
        header: "Unit",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="text-[12.5px] text-soil">{row.original.unitLabel}</span>
        ),
      },
      {
        id: "added",
        accessorFn: (i) => i.createdAt,
        header: "Added",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
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
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Input items
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          The catalogue of inputs granted to farmers (seed, fertiliser, cash)
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search item…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ New item</Link>
            </Button>
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
      ) : items.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching items"
                : "No input items yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination."
                : "Add the inputs you grant to farmers."
            }
            actionLabel={search || activeFilterCount > 0 ? undefined : "New item"}
            onAction={
              search || activeFilterCount > 0
                ? undefined
                : () => router.push(`${LIST}/new`)
            }
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IInputItem>
            columns={columns}
            data={items}
            itemNoun="items"
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(i) => `${LIST}/${i.id}/edit`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}
