"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateField,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useActivateSupplierMutation,
  useCreateSupplierMutation,
  useDeactivateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSupplierQuery,
  useGetSuppliersQuery,
  useUpdateSupplierMutation,
} from "@/redux/suppliers/suppliers-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  PurchaseSource,
  type ISupplier,
  type ISupplierListQuery,
} from "@/types/registry.types";
import {
  supplierSchema,
  type SupplierValues,
} from "@/validations/registry-schema";
import { LifecycleActions } from "./lifecycle-actions";
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

/** Date + time, e.g. "12 Jul 2026, 2:30 PM". */
export const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** "Added" / "Updated" timestamp line for a directory detail view. */
export function RecordTimestamps({
  createdAt,
  updatedAt,
}: {
  createdAt: string;
  updatedAt: string;
}) {
  return (
    <p className="mt-3 text-[12px] text-soil/80">
      Added {formatDateTime(createdAt)}
      {updatedAt && updatedAt !== createdAt ? (
        <> · Updated {formatDateTime(updatedAt)}</>
      ) : null}
    </p>
  );
}

const SOURCE_FILTER_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: PurchaseSource.INDIVIDUAL, label: "Individual" },
  { value: PurchaseSource.COMPANY, label: "Company" },
  { value: PurchaseSource.AGENT, label: "Agent" },
] as const;

const SOURCE_OPTIONS = [
  PurchaseSource.INDIVIDUAL,
  PurchaseSource.COMPANY,
  PurchaseSource.AGENT,
] as const;

/** The live Suppliers directory. */
export function SupplierTable() {
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

  const columns = useMemo<ColumnDef<ISupplier, unknown>[]>(
    () => [
      {
        id: "supplier",
        accessorFn: (s) => `${s.name} ${s.community ?? ""}`,
        header: "Supplier",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const s = row.original;
          return (
            <Link
              href={`${LIST}/${s.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {s.name}
                </span>
                <span className="block truncate text-[11.5px] text-soil/70">
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
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.phone ? (
            <span className="font-adminmono whitespace-nowrap text-[12.5px] text-soil">
              {row.original.phone}
            </span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "source",
        accessorFn: (s) => SOURCE_LABEL[s.sourceType],
        header: "Source",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-soil">
            {SOURCE_LABEL[row.original.sourceType]}
          </span>
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
          Suppliers
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Who the business buys from at the farm gate and beyond
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search supplier…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add supplier</Link>
            </Button>
          }
        >
          <ConsoleLabeledSelect
            label="Source"
            value={sourceFilter}
            onChange={(v) => setFilter("source", v)}
            options={SOURCE_FILTER_OPTIONS}
            active={sourceFilter !== "all"}
            className="lg:w-[150px]"
          />
          <ConsoleLabeledSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_FILTER_OPTIONS}
            active={statusFilter !== "all"}
            className="lg:w-[150px]"
          />
          <ConsoleDateField
            label="Added from"
            value={from}
            onChange={(v) => setFilter("from", v)}
            max={to || undefined}
          />
          <ConsoleDateField
            label="Added to"
            value={to}
            onChange={(v) => setFilter("to", v)}
            min={from || undefined}
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
      ) : suppliers.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching suppliers"
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
              title="No suppliers yet"
              description="Add the first person or company the business buys from."
              actionLabel="Add your first supplier"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
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
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}

function SupplierFormFields({ supplier }: { supplier?: ISupplier }) {
  const router = useRouter();
  const isEdit = supplier !== undefined;
  const [createSupplier, createState] = useCreateSupplierMutation();
  const [updateSupplier, updateState] = useUpdateSupplierMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit screens open READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      phone: supplier?.phone ?? "",
      community: supplier?.community ?? "",
      sourceType: supplier?.sourceType ?? PurchaseSource.INDIVIDUAL,
      notes: supplier?.notes ?? "",
    },
  });

  const onSubmit = async (values: SupplierValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateSupplier({
          id: supplier.id,
          body: {
            name: values.name,
            phone: opt(values.phone),
            community: opt(values.community),
            sourceType: values.sourceType,
            notes: opt(values.notes),
          },
        }).unwrap();
        notify.success("Supplier updated");
        setIsEditing(false);
      } else {
        const res = await createSupplier({
          name: values.name,
          ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
          ...(values.community?.trim()
            ? { community: values.community.trim() }
            : {}),
          sourceType: values.sourceType,
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        }).unwrap();
        notify.success("Supplier created");
        router.replace(`${LIST}/${res.data.supplier.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["name", "phone", "community", "notes"] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the supplier" : "Couldn't create the supplier",
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
            placeholder="e.g. Ibrahim Fuseini"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-error")}
            {...register("name")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="Phone" optional error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="024 000 0000"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.phone && "border-error")}
              {...register("phone")}
            />
          </AdminField>
          <AdminField
            label="Community"
            optional
            error={errors.community?.message}
          >
            <Input
              placeholder="e.g. Savelugu"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.community && "border-error",
              )}
              {...register("community")}
            />
          </AdminField>
        </div>
        <AdminField
          label="Source type"
          hint="Individual farmer, corporate seller, or an agent-recorded source."
        >
          <Controller
            control={control}
            name="sourceType"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={readOnly}
              >
                <SelectTrigger className={cn(adminSelectClass, roCls, "w-full")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((source) => (
                    <SelectItem key={source} value={source}>
                      {SOURCE_LABEL[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </AdminField>
        <AdminField label="Notes" optional error={errors.notes?.message}>
          <textarea
            rows={3}
            placeholder="Anything worth remembering about this supplier."
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "h-auto min-h-[76px] w-full resize-y py-2",
              errors.notes && "border-error",
            )}
            {...register("notes")}
          />
        </AdminField>
        <div className="mt-1 flex gap-2">
          {!isEdit ? (
            <>
              <AdminButton
                type="submit"
                disabled={saving}
                className="h-[38px] px-[18px]"
              >
                {saving ? "Saving…" : "Create supplier"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                className="h-[38px] px-3.5"
                onClick={() => router.push(LIST)}
              >
                Cancel
              </AdminButton>
            </>
          ) : isEditing ? (
            <>
              <AdminButton
                type="submit"
                disabled={saving}
                className="h-[38px] px-[18px]"
              >
                {saving ? "Saving…" : "Save changes"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                className="h-[38px] px-3.5"
                onClick={() => {
                  reset();
                  setIsEditing(false);
                }}
              >
                Cancel
              </AdminButton>
            </>
          ) : (
            <AdminButton
              type="button"
              variant="gold"
              className="h-[38px] px-[18px]"
              onClick={() => setIsEditing(true)}
            >
              Edit supplier
            </AdminButton>
          )}
        </div>
      </form>
    </AdminCard>
  );
}

export function SupplierCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All suppliers" className="mb-2" />
      <AdminPageHeader
        title="Add supplier"
        sub="A person or company the business buys from"
      />
      <SupplierFormFields />
    </div>
  );
}

export function SupplierEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetSupplierQuery(id);
  const [activate] = useActivateSupplierMutation();
  const [deactivate] = useDeactivateSupplierMutation();
  const [remove] = useDeleteSupplierMutation();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const supplier = data.data.supplier;
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All suppliers" className="mb-2" />
      <AdminPageHeader
        title={supplier.name}
        sub="Edit the supplier and their lifecycle"
      />
      <SupplierFormFields key={supplier.updatedAt} supplier={supplier} />
      <RecordTimestamps
        createdAt={supplier.createdAt}
        updatedAt={supplier.updatedAt}
      />
      <LifecycleActions
        noun="supplier"
        name={supplier.name}
        isActive={supplier.isActive}
        listHref={LIST}
        onActivate={() => activate(id).unwrap()}
        onDeactivate={() => deactivate(id).unwrap()}
        onDelete={() => remove(id).unwrap()}
      />
    </div>
  );
}
