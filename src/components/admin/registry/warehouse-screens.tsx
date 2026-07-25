"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { ConsoleFilterBar, ConsoleLabeledSelect } from "@/components/admin/filter-bar";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
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
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IRegistryListQuery, IWarehouse } from "@/types/registry.types";
import {
  warehouseSchema,
  type WarehouseValues,
} from "@/validations/registry-schema";
import { LifecycleActions } from "./lifecycle-actions";
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
        <DataTableSkeleton />
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

function WarehouseFormFields({ warehouse }: { warehouse?: IWarehouse }) {
  const router = useRouter();
  const isEdit = warehouse !== undefined;
  const [createWarehouse, createState] = useCreateWarehouseMutation();
  const [updateWarehouse, updateState] = useUpdateWarehouseMutation();
  const saving = createState.isLoading || updateState.isLoading;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<WarehouseValues>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: warehouse?.name ?? "",
      location: warehouse?.location ?? "",
    },
  });

  const onSubmit = async (values: WarehouseValues) => {
    const location = values.location?.trim() ?? "";
    try {
      if (isEdit) {
        await updateWarehouse({
          id: warehouse.id,
          body: { name: values.name, location: location || null },
        }).unwrap();
        notify.success("Warehouse updated");
      } else {
        const res = await createWarehouse({
          name: values.name,
          ...(location ? { location } : {}),
        }).unwrap();
        notify.success("Warehouse created");
        router.replace(`${LIST}/${res.data.warehouse.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["name", "location"] as const) {
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
            className={cn(adminInputClass, errors.name && "border-error")}
            {...register("name")}
          />
        </AdminField>
        <AdminField label="Location" optional error={errors.location?.message}>
          <Input
            placeholder="e.g. Tamale, Northern Region"
            className={cn(adminInputClass, errors.location && "border-error")}
            {...register("location")}
          />
        </AdminField>
        <div className="mt-1 flex gap-2">
          <AdminButton type="submit" disabled={saving} className="h-[38px] px-[18px]">
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create warehouse"}
          </AdminButton>
          <AdminButton
            type="button"
            variant="outline"
            className="h-[38px] px-3.5"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
        </div>
      </form>
    </AdminCard>
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

  if (isLoading) return <DataTableSkeleton />;
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
        sub="Edit the warehouse and its lifecycle"
      />
      <WarehouseFormFields key={warehouse.updatedAt} warehouse={warehouse} />
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
