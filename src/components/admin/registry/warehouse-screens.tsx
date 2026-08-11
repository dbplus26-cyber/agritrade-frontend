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
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  SectionHeading,
  adminInputClass,
  adminLinkClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { TitleCell } from "@/components/admin/table-cells";
import { BackButton } from "@/components/ui/BackButton";
import { ConsoleTableSkeleton, DetailSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
import { usePermissions } from "@/hooks/use-permissions";
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
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
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
  const { has } = usePermissions();
  const canManage = isSuperAdmin || has("VOCABULARY_MANAGE");

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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && warehouses.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IWarehouse, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (w) => w.name,
        header: "Warehouse",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <TitleCell
            href={`${LIST}/${row.original.id}`}
            title={row.original.name}
            stretch
          />
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
            <span className="block @2xl/table:max-w-[17rem] [overflow-wrap:anywhere] @2xl/table:truncate text-adm-muted">{row.original.location}</span>
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
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Warehouses
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            Where goods are received into and loaded out of
          </p>
        </div>
        {canManage ? (
              <AdminButton asChild>
                <Link href={`${LIST}/new`}>+ Add warehouse</Link>
              </AdminButton>
            ) : null}
      </div>

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search warehouse…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
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
        <RegisterEmpty
          filtered={filtered}
          noun="warehouses"
          description="Add the first storage location goods are received into."
          actionLabel={canManage ? "Add your first warehouse" : undefined}
          onAction={
            canManage ? () => router.push(`${LIST}/new`) : undefined
          }
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && warehouse) {
    return (
      <AdminCard className="px-5 py-[18px]">
        <RecordFacts
          facts={[
            { label: "Name", value: warehouse.name },
            { label: "Location", value: warehouse.location },
            { full: true, label: "Description", value: warehouse.description },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit warehouse
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="px-5 py-[18px]">
      {/* The name/location pair measures against this form, not the viewport:
          the console shell keeps a ~225px rail beside it, so `sm:` would pair
          them up while the column was still too narrow for two. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <section className="flex flex-col gap-5">
          <div className="grid gap-5 @min-[440px]:grid-cols-2">
            <AdminField label="Name" error={errors.name?.message}>
              <Input
                placeholder="e.g. Main Warehouse - Tamale"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
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
                  errors.location && "border-console-red",
                )}
                {...register("location")}
              />
            </AdminField>
          </div>
        </section>

        {/* What the shed is actually for - which commodities it holds, its
            capacity, whether it is fumigated. Operational detail that
            otherwise lives in one person's head. */}
        <section className="flex flex-col gap-5">
          <AdminField
            label="Description"
            optional
            hint="What this warehouse holds and anything staff need to know."
            error={errors.description?.message}
          >
            <textarea
              rows={4}
              placeholder="e.g. Maize and soya, 400 tonnes, fumigated monthly"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "h-auto min-h-[62px] w-full resize-y py-2",
                errors.description && "border-console-red",
              )}
              {...register("description")}
            />
          </AdminField>
        </section>

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
  // The largest holding sets the scale for the meter under each row, so the
  // list also READS as a distribution rather than a bare column of figures.
  const maxKg = rows.reduce((max, row) => Math.max(max, row.balanceKg), 0);

  return (
    // One filed card, not a floating heading over a bare list - the heading
    // rides in the card's own header band, the way the farmer page files its
    // guarantors, so the section holds together as a single object.
    <AdminCard className="overflow-hidden">
      <div className="border-b border-adm-hairline px-5 py-3">
        <SectionHeading
          className="mb-0"
          actions={
            <Link
              href="/admin/stock"
              className={cn(
                adminLinkClass,
                "whitespace-nowrap text-[12.5px] font-semibold",
              )}
            >
              Full stock view
            </Link>
          }
        >
          Commodities in this warehouse
        </SectionHeading>
        <p className="mt-0.5 text-[12px] text-adm-muted">
          {isLoading
            ? "Loading current balances…"
            : rows.length === 0
              ? "Derived from purchases, transfers and loadings."
              : `${String(rows.length)} ${rows.length === 1 ? "commodity" : "commodities"} currently held here.`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3 px-5 py-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-32" />
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          variant="plain"
          title="Nothing in stock here yet"
          description="Stock appears here the moment a purchase is received into this warehouse."
        />
      ) : (
        <>
          <ul className="divide-y divide-adm-hairline">
            {rows.map((row) => (
              <li key={row.commodityId} className="px-5 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    className={cn(
                      adminLinkClass,
                      "min-w-0 [overflow-wrap:anywhere] text-[13.5px] font-medium",
                    )}
                    href={`/admin/commodities/${row.commodityId}`}
                  >
                    {row.commodityName}
                  </Link>
                  <span
                    className="font-adminmono flex-none text-[13.5px] font-semibold tabular-nums text-adm-ink"
                    title={`${row.balanceKg.toLocaleString("en-GH")} kg`}
                  >
                    {formatKg(row.balanceKg)}
                  </span>
                </div>
                {/* Share-of-shed meter. aria-hidden: the figure beside it is
                    the fact; this is only its shape. */}
                <div
                  aria-hidden="true"
                  className="mt-1.5 h-1 overflow-hidden rounded-full bg-adm-sunken"
                >
                  <div
                    className="h-full rounded-full bg-console/60"
                    style={{
                      width: `${String(maxKg > 0 ? Math.max(2, (row.balanceKg / maxKg) * 100) : 0)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 border-t border-adm-hairline bg-adm-sunken px-5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-adm-muted">
              Total on hand
            </span>
            <span
              className="font-adminmono flex-none text-[14px] font-bold tabular-nums text-adm-ink"
              title={`${totalKg.toLocaleString("en-GH")} kg`}
            >
              {formatKg(totalKg)}
            </span>
          </div>
        </>
      )}
    </AdminCard>
  );
}

export function WarehouseCreate() {
  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All warehouses" className="mb-2" />
      <AdminPageHeader
        title="Add warehouse"
        hint="A storage location. Stock is counted separately per warehouse."
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
    <RecordShell
      backHref={LIST}
      backLabel="All warehouses"
      header={
        <AdminPageHeader
          title="Warehouse details"
          hint="One storage location and what is currently in it."
          sub="Warehouse record and current stock"
        />
      }
      aside={
        <>
          <RailStatus isActive={warehouse.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={warehouse.createdAt}
              updatedAt={warehouse.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="warehouse"
              name={warehouse.name}
              isActive={warehouse.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <WarehouseFormFields warehouse={warehouse} />
      <WarehouseStockSection warehouseId={id} />
    </RecordShell>
  );
}
