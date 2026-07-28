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
import {
  useActivateDeliveryAddressMutation,
  useCreateDeliveryAddressMutation,
  useDeactivateDeliveryAddressMutation,
  useDeleteDeliveryAddressMutation,
  useGetDeliveryAddressQuery,
  useGetDeliveryAddressesQuery,
  useUpdateDeliveryAddressMutation,
} from "@/redux/delivery-addresses/delivery-addresses-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type {
  IDeliveryAddress,
  IDeliveryAddressListQuery,
} from "@/types/logistics.types";
import {
  deliveryAddressSchema,
  type DeliveryAddressValues,
} from "@/validations/logistics-schema";
import { LifecycleActions } from "@/components/admin/registry/lifecycle-actions";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "@/components/admin/registry/registry-bits";
import { RecordTimestamps } from "@/components/admin/registry/supplier-screens";

const LIST = "/admin/delivery-addresses";
const FILTER_DEFAULTS = { status: "all", size: "10", from: "", to: "" };

/** The saved delivery-address book shipments ship to. */
export function DeliveryAddressTable() {
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

  const queryArgs = useMemo<IDeliveryAddressListQuery>(
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
    useGetDeliveryAddressesQuery(queryArgs);
  const addresses = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);

  const columns = useMemo<ColumnDef<IDeliveryAddress, unknown>[]>(
    () => [
      {
        id: "address",
        accessorFn: (a) => `${a.label} ${a.city}`,
        header: "Address",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <Link
              href={`${LIST}/${a.id}`}
              className="block min-w-0 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="block truncate font-medium text-ink">
                {a.label}
              </span>
              <span className="block truncate text-[11.5px] text-soil/70">
                {a.city}
                {a.area ? ` · ${a.area}` : ""}
              </span>
            </Link>
          );
        },
      },
      {
        id: "contact",
        accessorFn: (a) => `${a.contactName ?? ""} ${a.contactPhone ?? ""}`,
        header: "Contact",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => {
          const a = row.original;
          if (!a.contactName && !a.contactPhone) return <Absent />;
          return (
            <span className="block min-w-0">
              {a.contactName ? (
                <span className="block truncate text-[12.5px] text-ink">
                  {a.contactName}
                </span>
              ) : null}
              {a.contactPhone ? (
                <span className="font-adminmono block truncate text-[12px] text-soil">
                  {a.contactPhone}
                </span>
              ) : null}
            </span>
          );
        },
      },
      {
        id: "shop",
        accessorFn: (a) => a.shopName ?? "",
        header: "Shop",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) =>
          row.original.shopName ? (
            <span className="block max-w-[220px] truncate text-soil">
              {row.original.shopName}
            </span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (a) => a.createdAt,
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
          Delivery addresses
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          Saved destinations shipments deliver to, with the receiving contact
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search address…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add address</Link>
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
      ) : addresses.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching addresses"
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
              title="No delivery addresses yet"
              description="Save the destinations trucks regularly deliver to."
              actionLabel="Add your first address"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IDeliveryAddress>
            columns={columns}
            data={addresses}
            itemNoun="addresses"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(a) => `${LIST}/${a.id}`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}

function DeliveryAddressFormFields({ address }: { address?: IDeliveryAddress }) {
  const router = useRouter();
  const isEdit = address !== undefined;
  const [createAddress, createState] = useCreateDeliveryAddressMutation();
  const [updateAddress, updateState] = useUpdateDeliveryAddressMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit screens open READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DeliveryAddressValues>({
    resolver: zodResolver(deliveryAddressSchema),
    defaultValues: {
      label: address?.label ?? "",
      city: address?.city ?? "",
      area: address?.area ?? "",
      digitalAddress: address?.digitalAddress ?? "",
      landmark: address?.landmark ?? "",
      shopName: address?.shopName ?? "",
      contactName: address?.contactName ?? "",
      contactPhone: address?.contactPhone ?? "",
      directions: address?.directions ?? "",
    },
  });

  const onSubmit = async (values: DeliveryAddressValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateAddress({
          id: address.id,
          body: {
            label: values.label,
            city: values.city,
            area: opt(values.area),
            digitalAddress: opt(values.digitalAddress),
            landmark: opt(values.landmark),
            shopName: opt(values.shopName),
            contactName: opt(values.contactName),
            contactPhone: opt(values.contactPhone),
            directions: opt(values.directions),
          },
        }).unwrap();
        notify.success("Address updated");
        setIsEditing(false);
      } else {
        const res = await createAddress({
          label: values.label,
          city: values.city,
          ...(values.area?.trim() ? { area: values.area.trim() } : {}),
          ...(values.digitalAddress?.trim()
            ? { digitalAddress: values.digitalAddress.trim() }
            : {}),
          ...(values.landmark?.trim()
            ? { landmark: values.landmark.trim() }
            : {}),
          ...(values.shopName?.trim()
            ? { shopName: values.shopName.trim() }
            : {}),
          ...(values.contactName?.trim()
            ? { contactName: values.contactName.trim() }
            : {}),
          ...(values.contactPhone?.trim()
            ? { contactPhone: values.contactPhone.trim() }
            : {}),
          ...(values.directions?.trim()
            ? { directions: values.directions.trim() }
            : {}),
        }).unwrap();
        notify.success("Address saved");
        router.replace(`${LIST}/${res.data.address.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "label",
          "city",
          "area",
          "digitalAddress",
          "landmark",
          "shopName",
          "contactName",
          "contactPhone",
          "directions",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the address" : "Couldn't save the address",
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
        <AdminField
          label="Label"
          hint="How this address appears in pickers, e.g. 'Makola - Adjei Bros'."
          error={errors.label?.message}
        >
          <Input
            placeholder="e.g. Makola Market - Adjei Bros"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.label && "border-error")}
            {...register("label")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="City" error={errors.city?.message}>
            <Input
              placeholder="e.g. Accra"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.city && "border-error")}
              {...register("city")}
            />
          </AdminField>
          <AdminField label="Area" optional error={errors.area?.message}>
            <Input
              placeholder="e.g. Okaishie"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.area && "border-error")}
              {...register("area")}
            />
          </AdminField>
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Digital address"
            optional
            hint="GhanaPostGPS, e.g. GA-183-8164."
            error={errors.digitalAddress?.message}
          >
            <Input
              placeholder="GA-183-8164"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "font-adminmono",
                errors.digitalAddress && "border-error",
              )}
              {...register("digitalAddress")}
            />
          </AdminField>
          <AdminField label="Landmark" optional error={errors.landmark?.message}>
            <Input
              placeholder="e.g. Opposite the UBA branch"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.landmark && "border-error",
              )}
              {...register("landmark")}
            />
          </AdminField>
        </div>
        <AdminField label="Shop name" optional error={errors.shopName?.message}>
          <Input
            placeholder="e.g. Adjei Brothers Enterprise"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              errors.shopName && "border-error",
            )}
            {...register("shopName")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Contact name"
            optional
            error={errors.contactName?.message}
          >
            <Input
              placeholder="Who receives the goods"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.contactName && "border-error",
              )}
              {...register("contactName")}
            />
          </AdminField>
          <AdminField
            label="Contact phone"
            optional
            error={errors.contactPhone?.message}
          >
            <Input
              type="tel"
              placeholder="024 000 0000"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.contactPhone && "border-error",
              )}
              {...register("contactPhone")}
            />
          </AdminField>
        </div>
        <AdminField
          label="Directions"
          optional
          hint="Anything the driver needs to find the drop-off."
          error={errors.directions?.message}
        >
          <textarea
            rows={3}
            placeholder="e.g. Enter through the Kimberly Ave gate, third shop on the right."
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "h-auto min-h-[76px] w-full resize-y py-2",
              errors.directions && "border-error",
            )}
            {...register("directions")}
          />
        </AdminField>
        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Save address"
          editLabel="Edit address"
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

export function DeliveryAddressCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All addresses" className="mb-2" />
      <AdminPageHeader
        title="Add delivery address"
        sub="A destination trucks deliver to, saved for reuse"
      />
      <DeliveryAddressFormFields />
    </div>
  );
}

export function DeliveryAddressEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } =
    useGetDeliveryAddressQuery(id);
  const [activate] = useActivateDeliveryAddressMutation();
  const [deactivate] = useDeactivateDeliveryAddressMutation();
  const [remove] = useDeleteDeliveryAddressMutation();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const address = data.data.address;
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All addresses" className="mb-2" />
      <AdminPageHeader
        title={address.label}
        sub="Edit the delivery address and its lifecycle"
      />
      <DeliveryAddressFormFields key={address.updatedAt} address={address} />
      <RecordTimestamps
        createdAt={address.createdAt}
        updatedAt={address.updatedAt}
      />
      <LifecycleActions
        noun="delivery address"
        name={address.label}
        isActive={address.isActive}
        listHref={LIST}
        onActivate={() => activate(id).unwrap()}
        onDeactivate={() => deactivate(id).unwrap()}
        onDelete={() => remove(id).unwrap()}
      />
    </div>
  );
}
