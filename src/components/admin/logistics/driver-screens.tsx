"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
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
  SectionHeading,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  useActivateDriverMutation,
  useCreateDriverMutation,
  useDeactivateDriverMutation,
  useDeleteDriverMutation,
  useGetDriverQuery,
  useGetDriversQuery,
  useUpdateDriverMutation,
} from "@/redux/drivers/drivers-api";
import {
  PhotoViewDialog,
  ViewablePhoto,
} from "@/components/admin/photo-view";
import { useTableQuery } from "@/hooks/use-table-query";
import { useEditableRecordForm } from "@/hooks/use-editable-record-form";
import { usePhotoStaging } from "@/hooks/use-photo-staging";
import { extractApiError } from "@/lib/extract-api-error";
import { DateTimeCell } from "@/components/admin/date-cell";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IDriver, IDriverListQuery } from "@/types/logistics.types";
import { driverSchema, type DriverValues } from "@/validations/logistics-schema";
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
import { TextCell } from "@/components/admin/table-cells";
import { useGetDriverPaymentPoliciesQuery } from "@/redux/driver-settlement/driver-settlement-api";
import {
  RecordTimestamps,
  RegistryAvatar,
} from "@/components/admin/registry/supplier-screens";

const LIST = "/admin/drivers";
const FILTER_DEFAULTS = { status: "all", size: "10", from: "", to: "" };

/** The live Drivers directory (supplier-shaped registry). */
export function DriverTable() {
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

  const queryArgs = useMemo<IDriverListQuery>(
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
    useGetDriversQuery(queryArgs);
  const drivers = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && drivers.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IDriver, unknown>[]>(
    () => [
      {
        id: "driver",
        accessorFn: (d) => `${d.name} ${d.company ?? ""}`,
        header: "Driver",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const d = row.original;
          return (
            <Link
              href={`${LIST}/${d.id}`}
              className="flex min-w-0 items-center gap-2.5 outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <RegistryAvatar name={d.name} photoUrl={d.photoUrl} />
              <span className="block min-w-0 max-w-[85%]">
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                  {d.name}
                </span>
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
                  {d.company ?? "Independent"}
                </span>
              </span>
            </Link>
          );
        },
      },
      {
        id: "phone",
        accessorFn: (d) => d.phone,
        header: "Phone",
        enableSorting: false,
        meta: columnMeta({ at: "lg" }),
        cell: ({ row }) => (
          <span className="font-adminmono whitespace-nowrap text-adm-muted">
            {row.original.phone}
          </span>
        ),
      },
      {
        id: "city",
        accessorFn: (d) => d.city ?? "",
        header: "City",
        enableSorting: false,
        meta: columnMeta({ at: "xl" }),
        cell: ({ row }) =>
          row.original.city ? (
            <TextCell className="text-adm-muted" value={row.original.city} width="label" />
          ) : (
            <Absent />
          ),
      },
      {
        id: "added",
        accessorFn: (d) => d.createdAt,
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
      <div className="mb-3.5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
            Drivers
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            The trucking directory shipments pull their driver details from
          </p>
        </div>
        {<AdminButton asChild>
              <Link href={`${LIST}/new`}>+ Add driver</Link>
            </AdminButton>}
      </div>

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search driver…"
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
      ) : drivers.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="drivers"
          description="Add the drivers who haul the business's shipments."
          actionLabel="Add your first driver"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IDriver>
            columns={columns}
            data={drivers}
            itemNoun="drivers"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(d) => `${LIST}/${d.id}`}
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}

function DriverFormFields({ driver }: { driver?: IDriver }) {
  const router = useRouter();
  const isEdit = driver !== undefined;
  const [createDriver, createState] = useCreateDriverMutation();
  const [updateDriver, updateState] = useUpdateDriverMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // No sync callback here: this form is still key-remounted by the parent on
  // updatedAt, so a background refetch replaces it wholesale instead.
  const { isEditing, setIsEditing, readOnly, roCls, mode } =
    useEditableRecordForm(driver);

  // Photo travels WITH the save (multipart payload + file, the profile-photo
  // convention); `removePhoto` clears an existing one server-side.
  const {
    fileInputRef,
    photoFile,
    removePhoto,
    previewUrl,
    onPickFile,
    onRemove: onRemovePhoto,
    reset: resetPhoto,
  } = usePhotoStaging(driver?.photoUrl);
  const [viewPhoto, setViewPhoto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DriverValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: {
      name: driver?.name ?? "",
      phone: driver?.phone ?? "",
      email: driver?.email ?? "",
      company: driver?.company ?? "",
      city: driver?.city ?? "",
      licenseNo: driver?.licenseNo ?? "",
      idNumber: driver?.idNumber ?? "",
      notes: driver?.notes ?? "",
      paymentPolicyId: driver?.paymentPolicyId ?? "",
    },
  });
  // The owner-maintained policy register is a handful of rows, so one page is
  // the whole register and a native select over it is honest.
  const policies = useGetDriverPaymentPoliciesQuery({ isActive: true, limit: 100 });
  const watchedName = useWatch({ control, name: "name" });
  const avatarName = watchedName || driver?.name || "";

  const onSubmit = async (values: DriverValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateDriver({
          id: driver.id,
          body: {
            name: values.name,
            phone: values.phone.trim(),
            email: opt(values.email),
            company: opt(values.company),
            city: opt(values.city),
            licenseNo: opt(values.licenseNo),
            idNumber: opt(values.idNumber),
            notes: opt(values.notes),
            ...(removePhoto && !photoFile
              ? { removePhoto: true }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        resetPhoto();
        notify.success("Driver updated");
        setIsEditing(false);
      } else {
        const res = await createDriver({
          body: {
            name: values.name,
            phone: values.phone.trim(),
            ...(values.email?.trim() ? { email: values.email.trim() } : {}),
            ...(values.company?.trim()
              ? { company: values.company.trim() }
              : {}),
            ...(values.city?.trim() ? { city: values.city.trim() } : {}),
            ...(values.licenseNo?.trim()
              ? { licenseNo: values.licenseNo.trim() }
              : {}),
            ...(values.idNumber?.trim()
              ? { idNumber: values.idNumber.trim() }
              : {}),
            ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        notify.success("Driver added");
        router.replace(`${LIST}/${res.data.driver.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "name",
          "phone",
          "email",
          "company",
          "city",
          "licenseNo",
          "idNumber",
          "notes",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the driver" : "Couldn't add the driver",
        { description: message },
      );
    }
  };

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && driver) {
    return (
      <AdminCard className="max-w-[640px] px-5 py-[18px]">
        {/* The photograph belongs on the READ view, not only behind Edit.
            It was rendered inside the form, so at rest - which is how this
            page is nearly always seen - the record showed no picture at all,
            and the only way to look at one was to start editing. */}
        <div className="mb-4 flex items-center gap-3.5 border-b border-adm-hairline pb-4">
          <ViewablePhoto
            name={driver.name}
            size={64}
            src={driver.photoUrl}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
              {driver.name}
            </div>
            <div className="text-[12px] text-adm-muted">
              {driver.photoUrl ? "Tap the photo to see it in full" : "No photo on file"}
            </div>
          </div>
        </div>
        <RecordFacts
          facts={[
            { mono: true, label: "Phone", value: driver.phone },
            { label: "Email", value: driver.email },
            { label: "Company", value: driver.company },
            { label: "City", value: driver.city },
            { mono: true, label: "Licence no", value: driver.licenseNo },
            { mono: true, label: "ID number", value: driver.idNumber },
            { full: true, label: "Notes", value: driver.notes },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit driver
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="max-w-[640px] px-5 py-[18px]">
      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` paired fields up while
          the column was still too narrow to carry two of them. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <section className="flex flex-col gap-[13px]">
          <SectionHeading className="mb-0">Who they are</SectionHeading>
          {/* Not an AdminField: the control is a button, and a <label> around
              a button misroutes its clicks. Same label markup as AdminField so
              it stays in step with the fields under it. */}
          <div>
            <span className="mb-1 block text-[13px] font-semibold text-adm-ink">
              Photo <span className="font-normal text-adm-faint">(optional)</span>
            </span>
            <div className="flex flex-wrap items-center gap-3.5">
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
                <RegistryAvatar
                  name={avatarName}
                  photoUrl={previewUrl}
                  size={64}
                />
              )}
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? "Change photo" : "Add photo"}
                  </AdminButton>
                  {previewUrl ? (
                    <AdminButton
                      type="button"
                      variant="outline"
                      onClick={onRemovePhoto}
                    >
                      Remove photo
                    </AdminButton>
                  ) : null}
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onPickFile(file);
                }}
              />
            </div>
          </div>
          {previewUrl ? (
            <PhotoViewDialog
              src={previewUrl}
              name={avatarName || "Driver photo"}
              open={viewPhoto}
              onOpenChange={setViewPhoto}
            />
          ) : null}
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. Yakubu Andani"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField label="Phone" error={errors.phone?.message}>
              <Input
                type="tel"
                placeholder="e.g. 024 000 0000"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.phone && "border-console-red")}
                {...register("phone")}
              />
            </AdminField>
            <AdminField label="Email" optional error={errors.email?.message}>
              <Input
                type="email"
                placeholder="e.g. yakubu@example.com"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.email && "border-console-red")}
                {...register("email")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] pt-3 sm:pt-6">
          <SectionHeading className="mb-0">Where they work</SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField
              label="Company"
              optional
              hint="Haulage company, or leave blank for solo."
              error={errors.company?.message}
            >
              <Input
                placeholder="e.g. Sahel Haulage Ltd"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.company && "border-console-red",
                )}
                {...register("company")}
              />
            </AdminField>
            <AdminField label="City" optional error={errors.city?.message}>
              <Input
                placeholder="e.g. Tamale"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.city && "border-console-red")}
                {...register("city")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] pt-3 sm:pt-6">
          <SectionHeading
            className="mb-0"
            hint="The papers you checked, so the person driving your load can be identified."
          >
            Licence and ID
          </SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField
              label="Licence no"
              optional
              error={errors.licenseNo?.message}
            >
              <Input
                placeholder="e.g. DL-000000"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.licenseNo && "border-console-red",
                )}
                {...register("licenseNo")}
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
        </section>

        <section className="flex flex-col gap-[13px] pt-3 sm:pt-6">
          <SectionHeading className="mb-0">How they are paid</SectionHeading>
          {/* What this driver is normally paid on. The middle of the
              resolution order: a trip can override it, and a driver without one
              falls through to the system default. */}
          <AdminField
            error={errors.paymentPolicyId?.message}
            hint="Used when a trip does not set its own. Leave as the default if this driver has no special terms."
            label="Payment terms"
            optional
          >
            <Controller
              control={control}
              name="paymentPolicyId"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminSelectClass, roCls)}
                  disabled={readOnly}
                  value={field.value}
                  onChange={(v) =>
                    field.onChange(v === "__default__" ? "" : v)
                  }
                  placeholder="Use the system default"
                  // "Default" is a real choice, not just an unset state - the
                  // sentinel maps back to "" so a picked policy can be
                  // cleared again (Radix reserves the empty string).
                  options={[
                    { value: "__default__", label: "Use the system default" },
                    ...(policies.data?.data ?? []).map((p) => ({
                      value: p.id,
                      label: p.name,
                    })),
                  ]}
                />
              )}
            />
          </AdminField>
        </section>

        <section className="flex flex-col gap-[13px] pt-3 sm:pt-6">
          <SectionHeading className="mb-0">Anything else</SectionHeading>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <textarea
              rows={4}
              placeholder="e.g. Runs the Tamale to Accra leg overnight"
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
        </section>

        <div className="pt-3 sm:pt-6">
          <EditableFormActions
            mode={mode}
            saving={saving}
            createLabel="Add driver"
            editLabel="Edit driver"
            onEdit={() => setIsEditing(true)}
            onCancel={() => {
              if (!isEdit) {
                router.push(LIST);
                return;
              }
              reset();
              resetPhoto();
              setIsEditing(false);
            }}
          />
        </div>
      </form>
    </AdminCard>
  );
}

export function DriverCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All drivers"
      header={
        <AdminPageHeader title="Add driver"
        hint="A haulier who moves your goods. Their payment terms can be set here." sub="A trucker the shipments module can pick from" />
      }
    >
      <DriverFormFields />
    </RecordShell>
  );
}

export function DriverEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetDriverQuery(id);
  const [activate] = useActivateDriverMutation();
  const [deactivate] = useDeactivateDriverMutation();
  const [remove] = useDeleteDriverMutation();

  if (isLoading) return <FormSkeleton fields={6} />;
  if (isError || !data) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  const driver = data.data.driver;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All drivers"
      header={
        <AdminPageHeader title={driver.name} sub="Driver record" />
      }
      aside={
        <>
          <RailStatus isActive={driver.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={driver.createdAt}
              updatedAt={driver.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="driver"
              name={driver.name}
              isActive={driver.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <DriverFormFields key={driver.updatedAt} driver={driver} />
    </RecordShell>
  );
}
