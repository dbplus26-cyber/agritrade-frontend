"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
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
  adminSelectClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
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
import {
  PhotoViewDialog,
  ViewablePhoto,
} from "@/components/admin/photo-view";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { formatDateTime } from "@/lib/format-date";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/utils";
import { avatarOf } from "@/lib/avatar";
import {
  PurchaseSource,
  type ISupplier,
  type ISupplierListQuery,
} from "@/types/registry.types";
import {
  supplierSchema,
  type SupplierValues,
} from "@/validations/registry-schema";
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
    <p className="mt-3 text-[12px] text-adm-muted/80">
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
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const s = row.original;
          return (
            <Link
              href={`${LIST}/${s.id}`}
              className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <RegistryAvatar name={s.name} photoUrl={s.photoUrl} />
              <span className="block min-w-0 max-w-[85%]">
                <span className="block truncate font-medium text-adm-ink">
                  {s.name}
                </span>
                <span className="block truncate text-[11.5px] text-adm-faint">
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
            <span className="font-adminmono whitespace-nowrap text-[12.5px] text-adm-muted">
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
          <span className="block max-w-[22rem] truncate text-adm-muted">
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
          Suppliers
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}

/** "" for create, or the record's values for edit. */
const toSupplierValues = (supplier?: ISupplier): SupplierValues => ({
  name: supplier?.name ?? "",
  altPhone: supplier?.altPhone ?? "",
  phone: supplier?.phone ?? "",
  community: supplier?.community ?? "",
  sourceType: supplier?.sourceType ?? PurchaseSource.INDIVIDUAL,
  notes: supplier?.notes ?? "",
  email: supplier?.email ?? "",
  address: supplier?.address ?? "",
  idNumber: supplier?.idNumber ?? "",
  bankName: supplier?.bankName ?? "",
  bankAccountNumber: supplier?.bankAccountNumber ?? "",
  momoNumber: supplier?.momoNumber ?? "",
});

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
    stagedUrl ?? (!removePhoto ? (supplier?.photoUrl ?? null) : null);

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
  } = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: toSupplierValues(supplier),
  });

  // A background refetch can bump the record (another tab, a lifecycle
  // action). Track the fresh values while reading, but never clobber an
  // in-progress edit - which is why the parent no longer key-remounts the
  // form on updatedAt.
  useEffect(() => {
    if (!isEditing) {
      reset(toSupplierValues(supplier));
      // Drop any staged file from the native input too, so re-picking the
      // same photo later still fires onChange.
      if (fileInput.current) fileInput.current.value = "";
    }
  }, [supplier, isEditing, reset]);
  const watchedName = useWatch({ control, name: "name" });
  const avatarName = watchedName || supplier?.name || "";

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
            altPhone: opt(values.altPhone),
            phone: opt(values.phone),
            community: opt(values.community),
            sourceType: values.sourceType,
            notes: opt(values.notes),
            email: opt(values.email),
            address: opt(values.address),
            idNumber: opt(values.idNumber),
            bankName: opt(values.bankName),
            bankAccountNumber: opt(values.bankAccountNumber),
            momoNumber: opt(values.momoNumber),
            ...(removePhoto && !photoFile ? { removePhoto: true } : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        // Dropping back to read mode lets the sync effect adopt the fresh
        // values and finish the photo-input cleanup.
        setPhotoFile(null);
        setRemovePhoto(false);
        notify.success("Supplier updated");
        setIsEditing(false);
      } else {
        const res = await createSupplier({
          body: {
            name: values.name,
            ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
            ...(values.altPhone?.trim()
              ? { altPhone: values.altPhone.trim() }
              : {}),
            ...(values.community?.trim()
              ? { community: values.community.trim() }
              : {}),
            sourceType: values.sourceType,
            ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
            ...(values.email?.trim() ? { email: values.email.trim() } : {}),
            ...(values.address?.trim()
              ? { address: values.address.trim() }
              : {}),
            ...(values.idNumber?.trim()
              ? { idNumber: values.idNumber.trim() }
              : {}),
            ...(values.bankName?.trim()
              ? { bankName: values.bankName.trim() }
              : {}),
            ...(values.bankAccountNumber?.trim()
              ? { bankAccountNumber: values.bankAccountNumber.trim() }
              : {}),
            ...(values.momoNumber?.trim()
              ? { momoNumber: values.momoNumber.trim() }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        notify.success("Supplier created");
        router.replace(`${LIST}/${res.data.supplier.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "name",
          "phone",
          "altPhone",
          "community",
          "notes",
          "email",
          "address",
          "idNumber",
          "bankName",
          "bankAccountNumber",
          "momoNumber",
        ] as const) {
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && supplier) {
    return (
      <AdminCard className="px-5 py-[18px]">
        {/* The photograph belongs on the READ view, not only behind Edit.
            It was rendered inside the form, so at rest - which is how this
            page is nearly always seen - the record showed no picture at all,
            and the only way to look at one was to start editing. */}
        <div className="mb-4 flex items-center gap-3.5 border-b border-adm-hairline pb-4">
          <ViewablePhoto
            name={supplier.name}
            size={64}
            src={supplier.photoUrl}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
              {supplier.name}
            </div>
            <div className="text-[12px] text-adm-muted">
              {supplier.photoUrl ? "Tap the photo to see it in full" : "No photo on file"}
            </div>
          </div>
        </div>
        <RecordFacts
          facts={[
            { mono: true, label: "Phone", value: supplier.phone },
            { mono: true, label: "Other phone", value: supplier.altPhone },
            { label: "Community", value: supplier.community },
            { label: "Email", value: supplier.email },
            { mono: true, label: "ID number", value: supplier.idNumber },
            { full: true, label: "Address", value: supplier.address },
            { label: "Bank name", value: supplier.bankName },
            { mono: true, label: "Bank account number", value: supplier.bankAccountNumber },
            { mono: true, label: "Mobile money number", value: supplier.momoNumber },
            { full: true, label: "Notes", value: supplier.notes },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit supplier
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
            name={avatarName || "Supplier photo"}
            open={viewPhoto}
            onOpenChange={setViewPhoto}
          />
        ) : null}
        <AdminField label="Name" error={errors.name?.message}>
          <Input
            placeholder="e.g. Ibrahim Fuseini"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
            {...register("name")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="Phone" optional error={errors.phone?.message}>
            <Input
              type="tel"
              placeholder="024 000 0000"
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
                errors.community && "border-console-red",
              )}
              {...register("community")}
            />
          </AdminField>
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="Email" optional error={errors.email?.message}>
            <Input
              type="email"
              placeholder="supplier@example.com"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.email && "border-console-red")}
              {...register("email")}
            />
          </AdminField>
          <AdminField
            label="ID number"
            optional
            hint="Ghana Card or another official ID."
            error={errors.idNumber?.message}
          >
            <Input
              placeholder="e.g. GHA-000000000-0"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.idNumber && "border-console-red",
              )}
              {...register("idNumber")}
            />
          </AdminField>
        </div>
        <AdminField label="Address" optional error={errors.address?.message}>
          <Input
            placeholder="e.g. House No. 12, Savelugu"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              errors.address && "border-console-red",
            )}
            {...register("address")}
          />
        </AdminField>
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
        <div className="mt-1 border-t border-adm-hairline pt-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-adm-muted">
            Payout details
          </p>
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField label="Bank name" optional error={errors.bankName?.message}>
            <Input
              placeholder="e.g. GCB Bank"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.bankName && "border-console-red",
              )}
              {...register("bankName")}
            />
          </AdminField>
          <AdminField
            label="Bank account number"
            optional
            error={errors.bankAccountNumber?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="e.g. 1234567890123"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "font-adminmono",
                errors.bankAccountNumber && "border-console-red",
              )}
              {...register("bankAccountNumber")}
            />
          </AdminField>
        </div>
        <AdminField
          label="Mobile money number"
          optional
          error={errors.momoNumber?.message}
        >
          <Input
            type="tel"
            placeholder="024 000 0000"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              errors.momoNumber && "border-console-red",
            )}
            {...register("momoNumber")}
          />
        </AdminField>
        <AdminField label="Notes" optional error={errors.notes?.message}>
          <textarea
            rows={4}
            placeholder="Anything worth remembering about this supplier."
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
          createLabel="Create supplier"
          editLabel="Edit supplier"
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

export function SupplierCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All suppliers"
      header={
        <AdminPageHeader
          title="Add supplier"
          sub="A person or company the business buys from"
        />
      }
    >
      <SupplierFormFields />
    </RecordShell>
  );
}

export function SupplierEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetSupplierQuery(id);
  const [activate] = useActivateSupplierMutation();
  const [deactivate] = useDeactivateSupplierMutation();
  const [remove] = useDeleteSupplierMutation();

  if (isLoading) return <FormSkeleton fields={10} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const supplier = data.data.supplier;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All suppliers"
      header={
        <AdminPageHeader
          title="Supplier details"
        />
      }
      aside={
        <>
          <RailStatus isActive={supplier.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={supplier.createdAt}
              updatedAt={supplier.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="supplier"
              name={supplier.name}
              isActive={supplier.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <SupplierFormFields supplier={supplier} />
    </RecordShell>
  );
}
