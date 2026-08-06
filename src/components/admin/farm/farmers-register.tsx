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
import { AdminCard } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { useGetFarmersQuery } from "@/redux/farm/farmers-api";
import { avatarOf } from "@/lib/avatar";
import type { IFarmer, IFarmerListQuery } from "@/types/farm.types";
import { ACTIVE_FILTER_OPTIONS, ActiveBadge } from "./farm-bits";

const LIST = "/admin/farmers";
const FILTER_DEFAULTS = { active: "all", size: "10" };

function FarmerCell({ farmer }: { farmer: IFarmer }) {
  const a = avatarOf(farmer.name);
  return (
    // A real anchor, not just a clickable row: keyboard focus, middle-click and
    // "open in new tab" all come free from it and none work on a div onClick.
    <Link
      href={`${LIST}/${farmer.id}`}
      className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
      onClick={(e) => { e.stopPropagation(); }}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
        style={{ background: a.bg, color: a.fg }}
      >
        {a.init}
      </span>
      <div className="min-w-0 max-w-[21rem]">
        <div className="max-w-[20rem] truncate font-semibold text-adm-ink">{farmer.name}</div>
        {farmer.phone ? (
          <div className="text-[12px] text-adm-muted">{farmer.phone}</div>
        ) : null}
      </div>
    </Link>
  );
}

export function FarmersRegister() {
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

  const queryArgs = useMemo<IFarmerListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...(active !== "all" ? { isActive: active === "true" } : {}),
    }),
    [page, pageSize, search, active],
  );

  const { data, isLoading, isError, error, refetch } =
    useGetFarmersQuery(queryArgs);
  const farmers = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = active !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<IFarmer, unknown>[]>(
    () => [
      {
        id: "farmer",
        header: "Farmer",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => <FarmerCell farmer={row.original} />,
      },
      {
        id: "community",
        header: "Community",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <span className="text-[12.5px] text-adm-muted">
            {row.original.community ?? "-"}
          </span>
        ),
      },
      {
        id: "added",
        accessorFn: (f) => f.createdAt,
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
          Farmers
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Outgrower farmers in the input-grant programmes
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search name, phone, community…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add farmer</Link>
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
      ) : farmers.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title={
              search || activeFilterCount > 0
                ? "No matching farmers"
                : "No farmers yet"
            }
            description={
              search || activeFilterCount > 0
                ? "Nothing matches this search and filter combination."
                : "Add the first farmer to the register."
            }
            actionLabel={
              search || activeFilterCount > 0 ? undefined : "Add farmer"
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
          <ConsoleDataTable<IFarmer>
            columns={columns}
            data={farmers}
            itemNoun="farmers"
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(f) => `${LIST}/${f.id}`}
            rowClassName={() => "h-14 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
