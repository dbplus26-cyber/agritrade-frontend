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
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  SectionHeading,
  adminInputClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine = !isLoading && !isError && sellers.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<ILandSeller, unknown>[]>(
    () => [
      {
        id: "seller",
        accessorFn: (s) => `${s.name} ${s.community ?? ""}`,
        header: "Seller",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const s = row.original;
          return (
            <Link
              href={`${LIST}/${s.id}`}
              className="outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="block min-w-0 @2xl/table:max-w-[90%]">
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                  {s.name}
                </span>
                <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
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
            <span className="font-adminmono whitespace-nowrap text-adm-muted">
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
            Land sellers
          </h1>
          <p className="mt-0.5 text-[13px] text-adm-muted">
            People and companies the business buys land from
          </p>
        </div>
        {<AdminButton asChild>
              <Link href={`${LIST}/new`}>+ Add seller</Link>
            </AdminButton>}
      </div>

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search seller..."
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
      ) : sellers.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="sellers"
          description="Add the first person or company the business buys land from."
          actionLabel="Add your first seller"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
    </div>
  );
}

/** "" for create, or the record's values for edit. */
const toSellerValues = (seller?: ILandSeller): LandSellerValues => ({
  name: seller?.name ?? "",
  email: seller?.email ?? "",
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
            email: opt(values.email),
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
          ...(values.email?.trim() ? { email: values.email.trim() } : {}),
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
        for (const field of [
          "name",
          "phone",
          "email",
          "community",
          "notes",
        ] as const) {
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && seller) {
    return (
      <AdminCard className="max-w-[640px] px-5 py-[18px]">
        <RecordFacts
          facts={[
            { label: "Name", value: seller.name },
            { mono: true, label: "Phone", value: seller.phone },
            { label: "Email", value: seller.email },
            { label: "Community", value: seller.community },
            { full: true, label: "Notes", value: seller.notes },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit seller
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
          <SectionHeading
            className="mb-0"
            hint="Who the landowner is, and how you get hold of them."
          >
            Who they are
          </SectionHeading>
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. Alhaji Mahama"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                type="tel"
                placeholder="e.g. 024 000 0000"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.phone && "border-console-red")}
                {...register("phone")}
              />
            </AdminField>
            {/* Optional: most sellers here are reachable only by phone, but a
                company seller sends its paperwork by email. */}
            <AdminField label="Email" optional error={errors.email?.message}>
              <Input
                type="email"
                placeholder="e.g. mahama@example.com"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.email && "border-console-red")}
                {...register("email")}
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
                  errors.community && "border-console-red",
                )}
                {...register("community")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] pt-3 sm:pt-6">
          <SectionHeading className="mb-0">Anything else</SectionHeading>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <textarea
              rows={4}
              placeholder="e.g. Sells only through his son, who lives in Tamale"
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
        </div>
      </form>
    </AdminCard>
  );
}

export function LandSellerCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All sellers"
      header={
        <AdminPageHeader
          title="Add seller"
          hint="Someone you buy land from."
          sub="A landowner the business acquires plots from"
        />
      }
    >
      <LandSellerFormFields />
    </RecordShell>
  );
}

export function LandSellerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetLandSellerQuery(id);
  const [activate] = useActivateLandSellerMutation();
  const [deactivate] = useDeactivateLandSellerMutation();
  const [remove] = useDeleteLandSellerMutation();

  if (isLoading) return <FormSkeleton fields={5} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const seller = data.data.seller;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All sellers"
      header={<AdminPageHeader title={seller.name} sub="Seller record" />}
      aside={
        <>
          <RailStatus isActive={seller.isActive} />
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="seller"
              name={seller.name}
              isActive={seller.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <LandSellerFormFields seller={seller} />
    </RecordShell>
  );
}
