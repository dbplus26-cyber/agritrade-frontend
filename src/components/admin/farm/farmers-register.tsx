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
import { RegisterEmpty } from "@/components/admin/register-empty";
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
      <div className="w-full min-w-0">
        <div className="max-w-[85%] truncate font-semibold text-adm-ink" title={farmer.name}>
          {farmer.name}
        </div>
        {farmer.phone ? (
          <div className="text-[12.5px] text-adm-muted">{farmer.phone}</div>
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && farmers.length === 0 && !filtered;

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
          <span className="text-adm-muted">
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
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Farmers
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Outgrower farmers in the input-grant programmes
          </p>
        </div>
        {<AdminButton asChild>
              <Link href={`${LIST}/new`}>+ Add farmer</Link>
            </AdminButton>}
      </div>

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search name, phone, community…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
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
        <RegisterEmpty
          filtered={filtered}
          noun="farmers"
          description="Add the first farmer to the register."
          actionLabel="Add farmer"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
