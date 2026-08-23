"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
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
import { useGetSuppliersQuery } from "@/redux/suppliers/suppliers-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { usePermissions } from "@/hooks/use-permissions";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import { avatarOf } from "@/lib/avatar";
import {
  PurchaseSource,
  type ISupplier,
  type ISupplierListQuery,
} from "@/types/registry.types";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  SOURCE_LABEL,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";

const LIST = "/admin/suppliers";
const FILTER_DEFAULTS = { status: "all", source: "all", size: "10", from: "", to: "" };

/** "Added" / "Updated" timestamp line for a directory detail view. */
export function RecordTimestamps({
  createdAt,
  updatedAt,
}: {
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <p className="mt-3 text-[11px] text-adm-muted/80">
      Added {formatDateTime(createdAt)}
      {updatedAt && updatedAt !== createdAt ? (
        <> · Updated {formatDateTime(updatedAt)}</>
      ) : null}
    </p>
  );
}

/**
 * Photo-or-initials avatar for a directory row or detail card (the
 * farmers-register `FarmerCell` idiom, photo-aware). Shared with the buyer
 * screens.
 */
export function RegistryAvatar({
  name,
  photoUrl,
  size = 32,
  className,
}: {
  name: string;
  photoUrl: string | null;
  size?: number;
  className?: string;
}) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Cloudinary/objectURL avatar
      <img
        src={photoUrl}
        alt=""
        width={size}
        height={size}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  const a = avatarOf(name);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        className,
      )}
      style={{
        width: size,
        height: size,
        background: a.bg,
        color: a.fg,
        fontSize: Math.max(11, Math.round(size * 0.34)),
      }}
    >
      {a.init}
    </span>
  );
}

const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: PurchaseSource.INDIVIDUAL, label: "Individual" },
  { value: PurchaseSource.COMPANY, label: "Company" },
  { value: PurchaseSource.AGENT, label: "Agent" },
] as const;

/** The live Suppliers directory. */
export function SupplierTable() {
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
  const sourceFilter = filters.source;
  const from = filters.from;
  const to = filters.to;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<ISupplierListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
      ...(sourceFilter !== "all"
        ? { sourceType: sourceFilter as PurchaseSource }
        : {}),
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    }),
    [page, pageSize, search, statusFilter, sourceFilter, from, to],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetSuppliersQuery(queryArgs);
  const suppliers = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && suppliers.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<ISupplier, unknown>[]>(
    () => [
      {
        id: "supplier",
        accessorFn: (s) => `${s.name} ${s.community ?? ""}`,
        header: "Supplier",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const s = row.original;
          return (
            <Link
              href={`${LIST}/${s.id}`}
              className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <RegistryAvatar name={s.name} photoUrl={s.photoUrl} />
              <span className="block min-w-0 @2xl/table:max-w-[85%]">
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                  {s.name}
                </span>
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[11px] text-adm-faint">
                  {s.community ?? "No community"}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "phone",
        accessorFn: (s) => s.phone ?? "",
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
        id: "source",
        accessorFn: (s) => SOURCE_LABEL[s.sourceType],
        header: columnHelp(
          "Source",
          "What kind of seller this is: an individual farmer, a company, or one of your own agents.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "meta", wide: true }),
        cell: ({ row }) => (
          <span className="block @2xl/table:max-w-[22rem] [overflow-wrap:anywhere] @2xl/table:truncate text-adm-muted">
            {SOURCE_LABEL[row.original.sourceType]}
          </span>
        ),
      },
      {
        id: "added",
        accessorFn: (s) => s.createdAt,
        header: "Added",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
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
        title="Suppliers"
        sub="Who the business buys from at the farm gate and beyond"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search supplier…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="suppliers"
          action={
            canManage ? (
              <AdminButton asChild aria-label="Add supplier">
                <Link href={`${LIST}/new`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Add supplier</span>
                </Link>
              </AdminButton>
            ) : null
          }
          chips={
            <>
              {sourceFilter !== "all" ? (
                <FilterChip onRemove={() => setFilter("source", "all")}>
                  Source: {labelOf(SOURCE_FILTER_OPTIONS, sourceFilter)}
                </FilterChip>
              ) : null}
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
            hint="What kind of seller to show: individual farmers, companies, or your own agents."
            label="Source"
            value={sourceFilter}
            onChange={(v) => setFilter("source", v)}
            options={SOURCE_FILTER_OPTIONS}
            active={sourceFilter !== "all"}
          />
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
      ) : suppliers.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="suppliers"
          description="Add the first person or company the business buys from."
          actionLabel={canManage ? "Add your first supplier" : undefined}
          onAction={canManage ? () => router.push(`${LIST}/new`) : undefined}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ISupplier>
            columns={columns}
            data={suppliers}
            itemNoun="suppliers"
            isFetching={isFetching}
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
