"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  adminInputClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
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
import {
  PhotoViewDialog,
  ViewablePhoto,
} from "@/components/admin/photo-view";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/utils";
import type { IBuyer, IRegistryListQuery } from "@/types/registry.types";
import { buyerSchema, type BuyerValues } from "@/validations/registry-schema";
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
import { LifecycleActions } from "./lifecycle-actions";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";
import { RecordTimestamps, RegistryAvatar } from "./supplier-screens";

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
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const b = row.original;
          return (
            <Link
              href={`${LIST}/${b.id}`}
              className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <RegistryAvatar name={b.name} photoUrl={b.photoUrl} />
              <span className="block min-w-0 max-w-[85%]">
                <span className="block truncate font-medium text-adm-ink">
                  {b.name}
                </span>
                <span className="block truncate text-[11.5px] text-adm-faint">
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
            <span className="font-adminmono whitespace-nowrap text-[12.5px] text-adm-muted">
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
            <span className="block max-w-[17rem] truncate text-adm-muted">{row.original.email}</span>
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (b) => b.createdAt,
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
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Buyers
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}

/** "" for create, or the record's values for edit. */
const toBuyerValues = (buyer?: IBuyer): BuyerValues => ({
  name: buyer?.name ?? "",
  altPhone: buyer?.altPhone ?? "",
  phone: buyer?.phone ?? "",
  email: buyer?.email ?? "",
  city: buyer?.city ?? "",
  notes: buyer?.notes ?? "",
  address: buyer?.address ?? "",
  businessName: buyer?.businessName ?? "",
  registrationNumber: buyer?.registrationNumber ?? "",
  contactPersonName: buyer?.contactPersonName ?? "",
  contactPersonPhone: buyer?.contactPersonPhone ?? "",
});

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

  // Photo travels WITH the save (multipart payload + file, the profile-photo
  // convention); `removePhoto` clears an existing one server-side.
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [viewPhoto, setViewPhoto] = useState(false);
  const stagedUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );
  const previewUrl =
    stagedUrl ?? (!removePhoto ? (buyer?.photoUrl ?? null) : null);

  const clearPhotoState = () => {
    setPhotoFile(null);
    setRemovePhoto(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BuyerValues>({
    resolver: zodResolver(buyerSchema),
    defaultValues: toBuyerValues(buyer),
  });

  // A background refetch can bump the record (another tab, a lifecycle
  // action). Track the fresh values while reading, but never clobber an
  // in-progress edit - which is why the parent no longer key-remounts the
  // form on updatedAt.
  useEffect(() => {
    if (!isEditing) {
      reset(toBuyerValues(buyer));
      // Drop any staged file from the native input too, so re-picking the
      // same photo later still fires onChange.
      if (fileInput.current) fileInput.current.value = "";
    }
  }, [buyer, isEditing, reset]);
  const watchedName = useWatch({ control, name: "name" });
  const avatarName = watchedName || buyer?.name || "";

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
            altPhone: opt(values.altPhone),
            phone: opt(values.phone),
            email: opt(values.email),
            city: opt(values.city),
            notes: opt(values.notes),
            address: opt(values.address),
            businessName: opt(values.businessName),
            registrationNumber: opt(values.registrationNumber),
            contactPersonName: opt(values.contactPersonName),
            contactPersonPhone: opt(values.contactPersonPhone),
            ...(removePhoto && !photoFile ? { removePhoto: true } : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        // Dropping back to read mode lets the sync effect adopt the fresh
        // values and finish the photo-input cleanup.
        setPhotoFile(null);
        setRemovePhoto(false);
        notify.success("Buyer updated");
        setIsEditing(false);
      } else {
        const res = await createBuyer({
          body: {
            name: values.name,
            ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
            ...(values.altPhone?.trim()
              ? { altPhone: values.altPhone.trim() }
              : {}),
            ...(values.email?.trim() ? { email: values.email.trim() } : {}),
            ...(values.city?.trim() ? { city: values.city.trim() } : {}),
            ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
            ...(values.address?.trim()
              ? { address: values.address.trim() }
              : {}),
            ...(values.businessName?.trim()
              ? { businessName: values.businessName.trim() }
              : {}),
            ...(values.registrationNumber?.trim()
              ? { registrationNumber: values.registrationNumber.trim() }
              : {}),
            ...(values.contactPersonName?.trim()
              ? { contactPersonName: values.contactPersonName.trim() }
              : {}),
            ...(values.contactPersonPhone?.trim()
              ? { contactPersonPhone: values.contactPersonPhone.trim() }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        notify.success("Buyer created");
        router.replace(`${LIST}/${res.data.buyer.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "name",
          "phone",
          "altPhone",
          "email",
          "city",
          "notes",
          "address",
          "businessName",
          "registrationNumber",
          "contactPersonName",
          "contactPersonPhone",
        ] as const) {
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && buyer) {
    return (
      <AdminCard className="px-5 py-[18px]">
        {/* The photograph belongs on the READ view, not only behind Edit.
            It was rendered inside the form, so at rest - which is how this
            page is nearly always seen - the record showed no picture at all,
            and the only way to look at one was to start editing. */}
        <div className="mb-4 flex items-center gap-3.5 border-b border-adm-hairline pb-4">
          <ViewablePhoto
            name={buyer.name}
            size={64}
            src={buyer.photoUrl}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
              {buyer.name}
            </div>
            <div className="text-[12px] text-adm-muted">
              {buyer.photoUrl ? "Tap the photo to see it in full" : "No photo on file"}
            </div>
          </div>
        </div>
        <RecordFacts
          facts={[
            { mono: true, label: "Phone", value: buyer.phone },
            { mono: true, label: "Other phone", value: buyer.altPhone },
            { label: "City", value: buyer.city },
            { label: "Email", value: buyer.email },
            { full: true, label: "Address", value: buyer.address },
            { label: "Business name", value: buyer.businessName },
            { mono: true, label: "Registration number", value: buyer.registrationNumber },
            { label: "Contact person", value: buyer.contactPersonName },
            { mono: true, label: "Contact phone", value: buyer.contactPersonPhone },
            { full: true, label: "Notes", value: buyer.notes },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit buyer
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="px-5 py-[18px]">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[13px]"
      >
        <div className="flex items-center gap-3.5">
          {previewUrl && readOnly ? (
            <button
              type="button"
              onClick={() => setViewPhoto(true)}
              aria-label="View photo"
              title="View photo"
              className="cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-console/40"
            >
              <RegistryAvatar
                name={avatarName}
                photoUrl={previewUrl}
                size={64}
              />
            </button>
          ) : (
            <RegistryAvatar name={avatarName} photoUrl={previewUrl} size={64} />
          )}
          {isEditing ? (
            <div className="flex flex-wrap gap-2">
              <AdminButton
                type="button"
                variant="secondary"
                className="h-[32px] px-3 text-[12.5px]"
                onClick={() => fileInput.current?.click()}
              >
                {previewUrl ? "Change photo" : "Add photo"}
              </AdminButton>
              {previewUrl ? (
                <AdminButton
                  type="button"
                  variant="outline"
                  className="h-[32px] px-3 text-[12.5px]"
                  onClick={() => {
                    setPhotoFile(null);
                    setRemovePhoto(true);
                    if (fileInput.current) fileInput.current.value = "";
                  }}
                >
                  Remove photo
                </AdminButton>
              ) : null}
            </div>
          ) : null}
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                void optimizeImage(file).then((staged) => {
                  setPhotoFile(staged);
                  setRemovePhoto(false);
                });
              }
            }}
          />
        </div>
        {previewUrl ? (
          <PhotoViewDialog
            src={previewUrl}
            name={avatarName || "Buyer photo"}
            open={viewPhoto}
            onOpenChange={setViewPhoto}
          />
        ) : null}
        <AdminField label="Name" error={errors.name?.message}>
          <Input
            placeholder="e.g. Accra Grain Traders"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
            {...register("name")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="Phone" optional error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="055 000 0000"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.phone && "border-console-red")}
              {...register("phone")}
            />
          </AdminField>
          {/* A second line reaching the SAME person. Traders here carry two
              networks, and the number on file is the one that is off when a
              truck is at the gate. */}
          <AdminField
            label="Other phone"
            optional
            error={errors.altPhone?.message}
          >
            <Input
              type="tel"
              placeholder="024 000 0000"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.altPhone && "border-console-red",
              )}
              {...register("altPhone")}
            />
          </AdminField>
          <AdminField label="City" optional error={errors.city?.message}>
            <Input
              placeholder="e.g. Accra"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.city && "border-console-red")}
              {...register("city")}
            />
          </AdminField>
        </div>
        <AdminField label="Email" optional error={errors.email?.message}>
          <Input
            type="email"
            placeholder="orders@buyer.com"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.email && "border-console-red")}
            {...register("email")}
          />
        </AdminField>
        <AdminField label="Address" optional error={errors.address?.message}>
          <Input
            placeholder="e.g. Plot 5, Spintex Road, Accra"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              errors.address && "border-console-red",
            )}
            {...register("address")}
          />
        </AdminField>
        <div className="mt-1 border-t border-adm-hairline pt-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-adm-muted">
            Business
          </p>
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Business name"
            optional
            error={errors.businessName?.message}
          >
            <Input
              placeholder="e.g. Accra Grain Traders Ltd"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.businessName && "border-console-red",
              )}
              {...register("businessName")}
            />
          </AdminField>
          <AdminField
            label="Registration number"
            optional
            error={errors.registrationNumber?.message}
          >
            <Input
              placeholder="e.g. CS123456789"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "font-adminmono",
                errors.registrationNumber && "border-console-red",
              )}
              {...register("registrationNumber")}
            />
          </AdminField>
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Contact person name"
            optional
            error={errors.contactPersonName?.message}
          >
            <Input
              placeholder="e.g. Ama Mensah"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.contactPersonName && "border-console-red",
              )}
              {...register("contactPersonName")}
            />
          </AdminField>
          <AdminField
            label="Contact person phone"
            optional
            error={errors.contactPersonPhone?.message}
          >
            <Input
              type="tel"
              placeholder="055 000 0000"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.contactPersonPhone && "border-console-red",
              )}
              {...register("contactPersonPhone")}
            />
          </AdminField>
        </div>
        <AdminField label="Notes" optional error={errors.notes?.message}>
          <textarea
            rows={4}
            placeholder="Anything worth remembering about this buyer."
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "h-auto min-h-[104px] w-full resize-y py-2",
              errors.notes && "border-console-red",
            )}
            {...register("notes")}
          />
        </AdminField>
        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Create buyer"
          editLabel="Edit buyer"
          onEdit={() => setIsEditing(true)}
          onCancel={() => {
            if (!isEdit) {
              router.push(LIST);
              return;
            }
            reset();
            clearPhotoState();
            setIsEditing(false);
          }}
        />
      </form>
    </AdminCard>
  );
}

export function BuyerCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All buyers"
      header={
        <AdminPageHeader
          title="Add buyer"
          hint="Someone who buys from you. Their payment terms can be set here too."
          sub="A customer the business sells to"
        />
      }
    >
      <BuyerFormFields />
    </RecordShell>
  );
}

export function BuyerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetBuyerQuery(id);
  const [activate] = useActivateBuyerMutation();
  const [deactivate] = useDeactivateBuyerMutation();
  const [remove] = useDeleteBuyerMutation();

  if (isLoading) return <FormSkeleton fields={10} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const buyer = data.data.buyer;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All buyers"
      header={<AdminPageHeader title={buyer.name} sub="Buyer record" />}
      aside={
        <>
          <RailStatus isActive={buyer.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={buyer.createdAt}
              updatedAt={buyer.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="buyer"
              name={buyer.name}
              isActive={buyer.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <BuyerFormFields buyer={buyer} />
    </RecordShell>
  );
}
