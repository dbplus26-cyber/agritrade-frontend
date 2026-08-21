"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { TitleCell } from "@/components/admin/table-cells";
import { DateTimeCell } from "@/components/admin/date-cell";
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && items.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IInputItem, unknown>[]>(
    () => [
      {
        id: "name",
        header: "Item",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        // The description rides underneath rather than holding a column of
        // its own. Prose has no natural width, so given a column it is always
        // the one that pushes the table off the side of the screen; under the
        // name it is subordinate in the layout as well as the reading order.
        cell: ({ row }) => (
          <TitleCell
            href={`${LIST}/${row.original.id}/edit`}
            meta={row.original.description}
            title={row.original.name}
            stretch
          />
        ),
      },
      {
        id: "unit",
        header: columnHelp(
          "Unit",
          "How this item is handed out and counted: a bag, a litre, a piece.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="text-adm-muted">{row.original.unitLabel}</span>
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
      <AdminPageHeader
        title="Input items"
        sub="The catalogue of inputs granted to farmers (seed, fertiliser, cash)"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search item…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="items"
          action={
            <AdminButton asChild aria-label="New item">
              <Link href={`${LIST}/new`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">New item</span>
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
      ) : items.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="items"
          title="No input items yet"
          description="Add the inputs you grant to farmers."
          actionLabel="New item"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
