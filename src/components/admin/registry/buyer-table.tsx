"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import { AdminButton, AdminCard, AdminPageHeader } from "@/components/admin/ui";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useGetBuyersQuery } from "@/redux/buyers/buyers-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { usePermissions } from "@/hooks/use-permissions";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import type { IBuyer, IRegistryListQuery } from "@/types/registry.types";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";
import { RegistryAvatar } from "./supplier-table";

const LIST = "/admin/buyers";
const FILTER_DEFAULTS = { status: "all", size: "10", from: "", to: "" };

/** The live Buyers directory. */
export function BuyerTable() {
  const router = useRouter();
  const { has } = usePermissions();
  const canManage = has("DIRECTORY_MANAGE");
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

  const statusFilter = filters.status as StatusFilter;
  const from = filters.from;
  const to = filters.to;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IRegistryListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, search, statusFilter, from, to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetBuyersQuery(queryArgs);
  const buyers = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && buyers.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IBuyer, unknown>[]>(
    () => [
      {
        id: "buyer",
        accessorFn: (b) => `${b.name} ${b.city ?? ""}`,
        header: "Buyer",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const b = row.original;
          return (
            <Link
              href={`${LIST}/${b.id}`}
              className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <RegistryAvatar name={b.name} photoUrl={b.photoUrl} />
              <span className="block min-w-0 @2xl/table:max-w-[85%]">
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                  {b.name}
                </span>
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
                  {b.city ?? "No city"}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "phone",
        accessorFn: (b) => b.phone ?? "",
        header: "Phone",
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="font-adminmono whitespace-nowrap text-adm-muted">
              {row.original.phone}
            </span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "email",
        accessorFn: (b) => b.email ?? "",
        header: "Email",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.email ? (
            <span className="block @2xl/table:max-w-[17rem] [overflow-wrap:anywhere] @2xl/table:truncate text-adm-muted">{row.original.email}</span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (b) => b.createdAt,
        header: "Added",
        enableSorting: false,
        meta: columnMeta({ card: "meta", wide: true }),
        cell: ({ row }) => <DateTimeCell value={row.original.createdAt} />,
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Buyers"
        sub="Traders and companies the business sells to"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search buyer…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="buyers"
          action={
            canManage ? (
              <AdminButton asChild aria-label="Add buyer">
                <Link href={`${LIST}/new`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Add buyer</span>
                </Link>
              </AdminButton>
            ) : null
          }
          chips={
            <>
              {statusFilter !== "all" ? (
                <FilterChip onRemove={() => setFilter("status", "all")}>
                  Status: {labelOf(STATUS_FILTER_OPTIONS, statusFilter)}
                </FilterChip>
              ) : null}
              {from ? (
                <FilterChip onRemove={() => setFilter("from", "")}>
                  Added from: {from}
                </FilterChip>
              ) : null}
              {to ? (
                <FilterChip onRemove={() => setFilter("to", "")}>
                  Added to: {to}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleLabeledSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_FILTER_OPTIONS}
            active={statusFilter !== "all"}
          />
          <ConsoleDateRange
            fromLabel="Added from"
            toLabel="Added to"
            from={from}
            to={to}
            onFromChange={(v) => setFilter("from", v)}
            onToChange={(v) => setFilter("to", v)}
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
      ) : buyers.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="buyers"
          description="Add the first trader or company the business sells to."
          actionLabel={canManage ? "Add your first buyer" : undefined}
          onAction={canManage ? () => router.push(`${LIST}/new`) : undefined}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IBuyer>
            columns={columns}
            data={buyers}
            itemNoun="buyers"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(b) => `${LIST}/${b.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}
