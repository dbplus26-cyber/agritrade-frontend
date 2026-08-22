"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
  FilterChip,
  labelOf,
} from "@/components/admin/filter-bar";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailHeader,
  EditableFormActions,
  adminInputClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
import { usePermissions } from "@/hooks/use-permissions";
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
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
import { LifecycleActions } from "@/components/admin/registry/lifecycle-actions";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "@/components/admin/registry/registry-bits";
import { TextCell, TitleCell } from "@/components/admin/table-cells";
import { RecordTimestamps } from "@/components/admin/registry/supplier-screens";

const LIST = "/admin/delivery-addresses";
const FILTER_DEFAULTS = { status: "all", size: "10", from: "", to: "" };

/** The saved delivery-address book shipments ship to. */
export function DeliveryAddressTable() {
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && addresses.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IDeliveryAddress, unknown>[]>(
    () => [
      {
        id: "address",
        accessorFn: (a) => `${a.label} ${a.city}`,
        header: "Address",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <TitleCell
              href={`${LIST}/${a.id}`}
              meta={`${a.city}${a.area ? ` · ${a.area}` : ""}`}
              stretch
              title={a.label}
            />
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
            <TitleCell
              meta={a.contactPhone}
              title={a.contactName ?? a.contactPhone ?? ""}
              width="label"
            />
          );
        },
      },
      {
        id: "shop",
        accessorFn: (a) => a.shopName ?? "",
        header: columnHelp(
          "Shop",
          "The name of the business at this drop-off point, for a driver asking directions.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) =>
          row.original.shopName ? (
            <TextCell
              className="text-adm-muted"
              value={row.original.shopName}
              width="label"
            />
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (a) => a.createdAt,
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
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Delivery addresses"
        sub="Saved destinations shipments deliver to, with the receiving contact"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search address…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="addresses"
          action={
            canManage ? (
              <AdminButton asChild aria-label="Add address">
                <Link href={`${LIST}/new`}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Add address</span>
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
      ) : addresses.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="addresses"
          title="No delivery addresses yet"
          description="Save the destinations trucks regularly deliver to."
          actionLabel={canManage ? "Add your first address" : undefined}
          onAction={canManage ? () => router.push(`${LIST}/new`) : undefined}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
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

  // At rest an existing record READS - the form arrives on Edit, rather than
  // standing in as a greyed-out version of the page just left.
  if (isEdit && !isEditing && address) {
    return (
      <AdminCard className="max-w-[640px] px-5 py-[18px]">
        <RecordFacts
          facts={[
            { label: "Label", value: address.label },
            { label: "City", value: address.city },
            { label: "Area", value: address.area },
            {
              label: "Digital address",
              mono: true,
              value: address.digitalAddress,
            },
            { label: "Landmark", value: address.landmark },
            { label: "Shop name", value: address.shopName },
            { label: "Contact name", value: address.contactName },
            {
              label: "Contact phone",
              mono: true,
              value: address.contactPhone,
            },
            { full: true, label: "Directions", value: address.directions },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit address
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="max-w-[640px] px-5 py-[18px]">
      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` would pair fields up
          while the column is still too narrow to carry two of them. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <section className="flex flex-col gap-5">
          <AdminField
            label="Label"
            hint="How this address appears in pickers, e.g. 'Makola - Adjei Bros'."
            error={errors.label?.message}
          >
            <Input
              placeholder="e.g. Makola Market - Adjei Bros"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.label && "border-console-red")}
              {...register("label")}
            />
          </AdminField>
          <div className="grid gap-5 @min-[440px]:grid-cols-2">
            <AdminField label="City" error={errors.city?.message}>
              <Input
                placeholder="e.g. Accra"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.city && "border-console-red")}
                {...register("city")}
              />
            </AdminField>
            <AdminField label="Area" optional error={errors.area?.message}>
              <Input
                placeholder="e.g. Okaishie"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.area && "border-console-red")}
                {...register("area")}
              />
            </AdminField>
          </div>
          <div className="grid gap-5 @min-[440px]:grid-cols-2">
            <AdminField
              label="Digital address"
              optional
              hint="GhanaPostGPS, e.g. GA-183-8164."
              error={errors.digitalAddress?.message}
            >
              <Input
                placeholder="e.g. GA-183-8164"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  "font-adminmono",
                  errors.digitalAddress && "border-console-red",
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
                  errors.landmark && "border-console-red",
                )}
                {...register("landmark")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <AdminField label="Shop name" optional error={errors.shopName?.message}>
            <Input
              placeholder="e.g. Adjei Brothers Enterprise"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.shopName && "border-console-red",
              )}
              {...register("shopName")}
            />
          </AdminField>
          <div className="grid gap-5 @min-[440px]:grid-cols-2">
            <AdminField
              label="Contact name"
              optional
              error={errors.contactName?.message}
            >
              <Input
                placeholder="e.g. Kofi Adjei"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.contactName && "border-console-red",
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
                placeholder="e.g. 024 000 0000"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.contactPhone && "border-console-red",
                )}
                {...register("contactPhone")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-5">
          <AdminField
            label="Directions"
            optional
            hint="Anything the driver needs to find the drop-off."
            error={errors.directions?.message}
          >
            <textarea
              rows={4}
              placeholder="e.g. Enter through the Kimberly Ave gate, third shop on the right."
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "h-auto min-h-[104px] w-full resize-y py-2",
                errors.directions && "border-console-red",
              )}
              {...register("directions")}
            />
          </AdminField>
        </section>

        <div className="pt-3 sm:pt-6">
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
        </div>
      </form>
    </AdminCard>
  );
}

export function DeliveryAddressCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All addresses"
      current="Add delivery address"
      header={
        <DetailHeader
          title="Add delivery address"
          hint="A saved drop-off point, with directions so a driver can find it."
          sub="A destination trucks deliver to, saved for reuse"
        />
      }
    >
      <DeliveryAddressFormFields />
    </RecordShell>
  );
}

export function DeliveryAddressEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetDeliveryAddressQuery(id);
  const [activate] = useActivateDeliveryAddressMutation();
  const [deactivate] = useDeactivateDeliveryAddressMutation();
  const [remove] = useDeleteDeliveryAddressMutation();

  if (isLoading) return <FormSkeleton fields={8} />;
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const address = data.data.address;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All addresses"
      current={address.label}
      header={
        <DetailHeader title={address.label} sub="Delivery address record" />
      }
      aside={
        <>
          <RailStatus isActive={address.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={address.createdAt}
              updatedAt={address.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="address"
              name={address.label}
              isActive={address.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <DeliveryAddressFormFields key={address.updatedAt} address={address} />
    </RecordShell>
  );
}
