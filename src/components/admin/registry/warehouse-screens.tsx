"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { ConsoleFilterBar, ConsoleLabeledSelect } from "@/components/admin/filter-bar";
import {
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton, DetailSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetStockBalancesQuery } from "@/redux/stock/stock-api";
import {
  useActivateWarehouseMutation,
  useCreateWarehouseMutation,
  useDeactivateWarehouseMutation,
  useDeleteWarehouseMutation,
  useGetWarehouseQuery,
  useGetWarehousesQuery,
  useUpdateWarehouseMutation,
} from "@/redux/warehouses/warehouses-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { useAuthRole } from "@/hooks/use-auth-role";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { formatKg } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IRegistryListQuery, IWarehouse } from "@/types/registry.types";
import {
  warehouseSchema,
  type WarehouseValues,
} from "@/validations/registry-schema";
import { LifecycleActions } from "./lifecycle-actions";
import { RecordTimestamps } from "./supplier-screens";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";

const LIST = "/admin/warehouses";
const FILTER_DEFAULTS = { status: "all", size: "10" };

/** The live Warehouses register. */
export function WarehouseTable() {
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
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IRegistryListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
    }),
    [page, pageSize, search, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetWarehousesQuery(queryArgs);
  const warehouses = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<IWarehouse, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (w) => w.name,
        header: "Warehouse",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Link
            href={`${LIST}/${row.original.id}`}
            className="block truncate font-medium text-ink outline-none focus-visible:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "location",
        accessorFn: (w) => w.location ?? "",
        header: "Location",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.location ? (
            <span className="truncate text-soil">{row.original.location}</span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (w) => w.createdAt,
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
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  return (
    <div>
      <div className="mb-3.5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-ink">
          Warehouses
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Where goods are received into and loaded out of
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search warehouse…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            isSuperAdmin ? (
              <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
                <Link href={`${LIST}/new`}>+ Add warehouse</Link>
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
        </ConsoleFilterBar>
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={4} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : warehouses.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching warehouses"
              description="Nothing matches this search and filter combination."
              actionLabel="Clear search & filters"
              onAction={() => {
                setSearch("");
                resetFilters();
              }}
            />
          ) : (
            <EmptyState
              variant="plain"
              title="No warehouses yet"
              description="Add the first storage location goods are received into."
              actionLabel="Add your first warehouse"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IWarehouse>
            columns={columns}
            data={warehouses}
            itemNoun="warehouses"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(w) => `${LIST}/${w.id}`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}

/** "" for create, or the record's values for edit. */
const toWarehouseValues = (warehouse?: IWarehouse): WarehouseValues => ({
  description: warehouse?.description ?? "",
  name: warehouse?.name ?? "",
  location: warehouse?.location ?? "",
});

function WarehouseFormFields({ warehouse }: { warehouse?: IWarehouse }) {
  const router = useRouter();
  const isEdit = warehouse !== undefined;
  const [createWarehouse, createState] = useCreateWarehouseMutation();
  const [updateWarehouse, updateState] = useUpdateWarehouseMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Detail screens open READ-ONLY; the Edit button unlocks the inputs. Create
  // is always editable.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<WarehouseValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: toWarehouseValues(warehouse),
  });

  // A background refetch can bump the record (another tab, a lifecycle
  // action). Track the fresh values while reading, but never clobber an
  // in-progress edit - which is why the parent no longer key-remounts the
  // form on updatedAt.
  useEffect(() => {
    if (!isEditing) reset(toWarehouseValues(warehouse));
  }, [warehouse, isEditing, reset]);

  const onSubmit = async (values: WarehouseValues) => {
    const location = values.location?.trim() ?? "";
    const description = values.description?.trim() ?? "";
    try {
      if (isEdit) {
        await updateWarehouse({
          id: warehouse.id,
          body: {
            description: description || null,
            location: location || null,
            name: values.name,
          },
        }).unwrap();
        notify.success("Warehouse updated");
        setIsEditing(false);
      } else {
        const res = await createWarehouse({
          name: values.name,
          ...(location ? { location } : {}),
          ...(description ? { description } : {}),
        }).unwrap();
        notify.success("Warehouse created");
        router.replace(`${LIST}/${res.data.warehouse.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["name", "location", "description"] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the warehouse" : "Couldn't create the warehouse",
        { description: message },
      );
    }
  };

  return (
    <AdminCard className="px-5 py-[18px]">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[13px]"
      >
        <AdminField label="Name" error={errors.name?.message}>
          <Input
            placeholder="e.g. Main Warehouse - Tamale"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-error")}
            {...register("name")}
          />
        </AdminField>
        <AdminField label="Location" optional error={errors.location?.message}>
          <Input
            placeholder="e.g. Tamale, Northern Region"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              errors.location && "border-error",
            )}
            {...register("location")}
          />
        </AdminField>
        {/* What the shed is actually for - which commodities it holds, its
            capacity, whether it is fumigated. Operational detail that
            otherwise lives in one person's head. */}
        <AdminField
          label="Description"
          optional
          hint="e.g. Maize and soya, 400 tonnes, fumigated monthly."
          error={errors.description?.message}
        >
          <textarea
            rows={2}
            placeholder="What this warehouse holds and anything staff need to know"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "h-auto min-h-[62px] w-full resize-y py-2",
              errors.description && "border-error",
            )}
            {...register("description")}
          />
        </AdminField>
        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Create warehouse"
          editLabel="Edit warehouse"
          onEdit={() => setIsEditing(true)}
          onCancel={() => {
            if (!isEdit) {
              router.push(LIST);
              return;
            }
            reset();
            setIsEditing(false);
          }}
        />
      </form>
    </AdminCard>
  );
}

/**
 * Current stock held in this warehouse - the same derived balances the
 * /admin/stock view shows, filtered to one location.
 */
function WarehouseStockSection({ warehouseId }: { warehouseId: string }) {
  const { data, isLoading, isError, error, refetch } = useGetStockBalancesQuery(
    { warehouseId },
  );
  const rows = data?.data ?? [];
  const totalKg = rows.reduce((sum, row) => sum + row.balanceKg, 0);

  return (
    <div className="mt-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-soil">
          Commodities in this warehouse
        </h2>
        <Link
          href="/admin/stock"
          className="whitespace-nowrap text-[12.5px] font-semibold text-console underline-offset-2 hover:underline"
        >
          Full stock view
        </Link>
      </div>

      {isLoading ? (
        <AdminCard className="px-4 py-3.5">
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3.5 w-16" />
              </div>
            ))}
          </div>
        </AdminCard>
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="Nothing in stock here yet"
            description="Stock appears here the moment a purchase is received into this warehouse."
          />
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ul>
            {rows.map((row) => (
              <li
                key={row.commodityId}
                className="flex items-center justify-between gap-3 border-b border-soil/15 px-4 py-2.5"
              >
                <span className="min-w-0 truncate text-[13.5px] font-medium text-ink">
                  {row.commodityName}
                </span>
                <span
                  className="font-adminmono flex-none text-[13.5px] font-semibold text-ink"
                  title={`${row.balanceKg.toLocaleString("en-GH")} kg`}
                >
                  {formatKg(row.balanceKg)}
                </span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 bg-surface-alt/60 px-4 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-soil">
              Total on hand
            </span>
            <span
              className="font-adminmono flex-none text-[13.5px] font-bold text-ink"
              title={`${totalKg.toLocaleString("en-GH")} kg`}
            >
              {formatKg(totalKg)}
            </span>
          </div>
        </AdminCard>
      )}
    </div>
  );
}

export function WarehouseCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All warehouses" className="mb-2" />
      <AdminPageHeader
        title="Add warehouse"
        sub="A storage location goods are received into and loaded out of"
      />
      <WarehouseFormFields />
    </div>
  );
}

export function WarehouseEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetWarehouseQuery(id);
  const [activate] = useActivateWarehouseMutation();
  const [deactivate] = useDeactivateWarehouseMutation();
  const [remove] = useDeleteWarehouseMutation();

  if (isLoading) return <DetailSkeleton facts={4} table />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const warehouse = data.data.warehouse;
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All warehouses" className="mb-2" />
      <AdminPageHeader
        title={warehouse.name}
        sub="Warehouse record and current stock"
      />
      <WarehouseFormFields warehouse={warehouse} />
      <RecordTimestamps
        createdAt={warehouse.createdAt}
        updatedAt={warehouse.updatedAt}
      />
      <WarehouseStockSection warehouseId={id} />
      <LifecycleActions
        noun="warehouse"
        name={warehouse.name}
        isActive={warehouse.isActive}
        listHref={LIST}
        onActivate={() => activate(id).unwrap()}
        onDeactivate={() => deactivate(id).unwrap()}
        onDelete={() => remove(id).unwrap()}
      />
    </div>
  );
}
