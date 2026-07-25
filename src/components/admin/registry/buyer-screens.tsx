"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  useActivateBuyerMutation,
  useCreateBuyerMutation,
  useDeactivateBuyerMutation,
  useDeleteBuyerMutation,
  useGetBuyerQuery,
  useGetBuyersQuery,
  useUpdateBuyerMutation,
} from "@/redux/buyers/buyers-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IBuyer, IRegistryListQuery } from "@/types/registry.types";
import { buyerSchema, type BuyerValues } from "@/validations/registry-schema";
import { LifecycleActions } from "./lifecycle-actions";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";
import { RecordTimestamps } from "./supplier-screens";

const LIST = "/admin/buyers";
const FILTER_DEFAULTS = { status: "all", size: "10", from: "", to: "" };

/** The live Buyers directory. */
export function BuyerTable() {
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

  const columns = useMemo<ColumnDef<IBuyer, unknown>[]>(
    () => [
      {
        id: "buyer",
        accessorFn: (b) => `${b.name} ${b.city ?? ""}`,
        header: "Buyer",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const b = row.original;
          return (
            <Link
              href={`${LIST}/${b.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">
                  {b.name}
                </span>
                <span className="block truncate text-[11.5px] text-soil/70">
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
        id: "email",
        accessorFn: (b) => b.email ?? "",
        header: "Email",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.email ? (
            <span className="truncate text-soil">{row.original.email}</span>
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
          Buyers
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Traders and companies the business sells to
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search buyer…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add buyer</Link>
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
      ) : buyers.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching buyers"
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
              title="No buyers yet"
              description="Add the first trader or company the business sells to."
              actionLabel="Add your first buyer"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
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
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}

function BuyerFormFields({ buyer }: { buyer?: IBuyer }) {
  const router = useRouter();
  const isEdit = buyer !== undefined;
  const [createBuyer, createState] = useCreateBuyerMutation();
  const [updateBuyer, updateState] = useUpdateBuyerMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit screens open READ-ONLY; the Edit button unlocks the inputs.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BuyerValues>({
    resolver: zodResolver(buyerSchema),
    defaultValues: {
      name: buyer?.name ?? "",
      phone: buyer?.phone ?? "",
      email: buyer?.email ?? "",
      city: buyer?.city ?? "",
      notes: buyer?.notes ?? "",
    },
  });

  const onSubmit = async (values: BuyerValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateBuyer({
          id: buyer.id,
          body: {
            name: values.name,
            phone: opt(values.phone),
            email: opt(values.email),
            city: opt(values.city),
            notes: opt(values.notes),
          },
        }).unwrap();
        notify.success("Buyer updated");
        setIsEditing(false);
      } else {
        const res = await createBuyer({
          name: values.name,
          ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
          ...(values.email?.trim() ? { email: values.email.trim() } : {}),
          ...(values.city?.trim() ? { city: values.city.trim() } : {}),
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        }).unwrap();
        notify.success("Buyer created");
        router.replace(`${LIST}/${res.data.buyer.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["name", "phone", "email", "city", "notes"] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the buyer" : "Couldn't create the buyer",
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
            placeholder="e.g. Accra Grain Traders"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-error")}
            {...register("name")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="Phone" optional error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="055 000 0000"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.phone && "border-error")}
              {...register("phone")}
            />
          </AdminField>
          <AdminField label="City" optional error={errors.city?.message}>
            <Input
              placeholder="e.g. Accra"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.city && "border-error")}
              {...register("city")}
            />
          </AdminField>
        </div>
        <AdminField label="Email" optional error={errors.email?.message}>
          <Input
            type="email"
            placeholder="orders@buyer.com"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.email && "border-error")}
            {...register("email")}
          />
        </AdminField>
        <AdminField label="Notes" optional error={errors.notes?.message}>
          <textarea
            rows={3}
            placeholder="Anything worth remembering about this buyer."
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
                {saving ? "Saving…" : "Create buyer"}
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
              Edit buyer
            </AdminButton>
          )}
        </div>
      </form>
    </AdminCard>
  );
}

export function BuyerCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All buyers" className="mb-2" />
      <AdminPageHeader
        title="Add buyer"
        sub="A trader or company the business sells to"
      />
      <BuyerFormFields />
    </div>
  );
}

export function BuyerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetBuyerQuery(id);
  const [activate] = useActivateBuyerMutation();
  const [deactivate] = useDeactivateBuyerMutation();
  const [remove] = useDeleteBuyerMutation();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const buyer = data.data.buyer;
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All buyers" className="mb-2" />
      <AdminPageHeader
        title={buyer.name}
        sub="Edit the buyer and their lifecycle"
      />
      <BuyerFormFields key={buyer.updatedAt} buyer={buyer} />
      <RecordTimestamps createdAt={buyer.createdAt} updatedAt={buyer.updatedAt} />
      <LifecycleActions
        noun="buyer"
        name={buyer.name}
        isActive={buyer.isActive}
        listHref={LIST}
        onActivate={() => activate(id).unwrap()}
        onDeactivate={() => deactivate(id).unwrap()}
        onDelete={() => remove(id).unwrap()}
      />
    </div>
  );
}
