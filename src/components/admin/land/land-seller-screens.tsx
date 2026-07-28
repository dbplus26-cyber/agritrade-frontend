"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import {
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useActivateLandSellerMutation,
  useCreateLandSellerMutation,
  useDeactivateLandSellerMutation,
  useDeleteLandSellerMutation,
  useGetLandSellerQuery,
  useGetLandSellersQuery,
  useUpdateLandSellerMutation,
} from "@/redux/land/land-sellers-api";
import type { ILandSeller, ILandSellerListQuery } from "@/types/land.types";
import {
  landSellerSchema,
  type LandSellerValues,
} from "@/validations/land-schema";
import { LifecycleActions } from "@/components/admin/registry/lifecycle-actions";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "@/components/admin/registry/registry-bits";

const LIST = "/admin/land-sellers";
const FILTER_DEFAULTS = { status: "all", size: "10" };

/** The live land-sellers directory. */
export function LandSellerTable() {
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
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<ILandSellerListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
    }),
    [page, pageSize, search, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetLandSellersQuery(queryArgs);
  const sellers = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<ILandSeller, unknown>[]>(
    () => [
      {
        id: "seller",
        accessorFn: (s) => `${s.name} ${s.community ?? ""}`,
        header: "Seller",
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
        meta: columnMeta({ wide: true }),
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
          Land sellers
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          People and companies the business buys land from
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search seller..."
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add seller</Link>
            </Button>
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
      ) : sellers.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching sellers"
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
              title="No sellers yet"
              description="Add the first person or company the business buys land from."
              actionLabel="Add your first seller"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<ILandSeller>
            columns={columns}
            data={sellers}
            itemNoun="sellers"
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

/** "" for create, or the record's values for edit. */
const toSellerValues = (seller?: ILandSeller): LandSellerValues => ({
  name: seller?.name ?? "",
  phone: seller?.phone ?? "",
  community: seller?.community ?? "",
  notes: seller?.notes ?? "",
});

function LandSellerFormFields({ seller }: { seller?: ILandSeller }) {
  const router = useRouter();
  const isEdit = seller !== undefined;
  const [createSeller, createState] = useCreateLandSellerMutation();
  const [updateSeller, updateState] = useUpdateLandSellerMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit screens open READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
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
  } = useForm<LandSellerValues>({
    resolver: zodResolver(landSellerSchema),
    defaultValues: toSellerValues(seller),
  });

  // A background refetch can bump the record (another tab, a lifecycle
  // action). Track the fresh values while reading, but never clobber an
  // in-progress edit - which is why the parent does not key-remount the form
  // on updatedAt.
  useEffect(() => {
    if (!isEditing) reset(toSellerValues(seller));
  }, [seller, isEditing, reset]);

  const onSubmit = async (values: LandSellerValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateSeller({
          id: seller.id,
          body: {
            name: values.name,
            phone: opt(values.phone),
            community: opt(values.community),
            notes: opt(values.notes),
          },
        }).unwrap();
        notify.success("Seller updated");
        setIsEditing(false);
      } else {
        const res = await createSeller({
          name: values.name,
          ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
          ...(values.community?.trim()
            ? { community: values.community.trim() }
            : {}),
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        }).unwrap();
        notify.success("Seller created");
        router.replace(`${LIST}/${res.data.seller.id}`);
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
        isEdit ? "Couldn't update the seller" : "Couldn't create the seller",
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
            placeholder="e.g. Alhaji Mahama"
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
              placeholder="e.g. Kumbungu"
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
        <AdminField label="Notes" optional error={errors.notes?.message}>
          <textarea
            rows={3}
            placeholder="Anything worth remembering about this seller."
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
        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Create seller"
          editLabel="Edit seller"
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

export function LandSellerCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All sellers" className="mb-2" />
      <AdminPageHeader
        title="Add seller"
        sub="A person or company the business buys land from"
      />
      <LandSellerFormFields />
    </div>
  );
}

export function LandSellerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetLandSellerQuery(id);
  const [activate] = useActivateLandSellerMutation();
  const [deactivate] = useDeactivateLandSellerMutation();
  const [remove] = useDeleteLandSellerMutation();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const seller = data.data.seller;
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All sellers" className="mb-2" />
      <AdminPageHeader
        title={seller.name}
        sub="Edit the seller and their lifecycle"
      />
      <LandSellerFormFields seller={seller} />
      <LifecycleActions
        noun="seller"
        name={seller.name}
        isActive={seller.isActive}
        listHref={LIST}
        onActivate={() => activate(id).unwrap()}
        onDeactivate={() => deactivate(id).unwrap()}
        onDelete={() => remove(id).unwrap()}
      />
    </div>
  );
}
