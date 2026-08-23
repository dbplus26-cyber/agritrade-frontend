"use client";

import { useMemo, } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
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
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  useActivatePaymentAccountMutation,
  useCreatePaymentAccountMutation,
  useDeactivatePaymentAccountMutation,
  useDeletePaymentAccountMutation,
  useGetPaymentAccountQuery,
  useGetPaymentAccountsQuery,
  useUpdatePaymentAccountMutation,
} from "@/redux/payment-accounts/payment-accounts-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type {
  IPaymentAccount,
  IPaymentAccountListQuery,
  PaymentAccountKind,
} from "@/types/payment-account.types";
import {
  paymentAccountSchema,
  type PaymentAccountFormValues,
} from "@/validations/payment-account-schema";
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

const LIST = "/admin/payment-accounts";
const FILTER_DEFAULTS = { status: "all", kind: "all", size: "10" };

const KIND_LABEL: Record<PaymentAccountKind, string> = {
  BANK: "Bank",
  CASH: "Cash",
  MOMO: "Mobile money",
  OTHER: "Other",
};

const KIND_FILTER_OPTIONS = [
  { value: "all", label: "All kinds" },
  { value: "BANK", label: "Bank" },
  { value: "MOMO", label: "Mobile money" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

const KIND_OPTIONS = [
  { value: "BANK", label: "Bank account" },
  { value: "MOMO", label: "Mobile money" },
  { value: "CASH", label: "Cash" },
  { value: "OTHER", label: "Other" },
];

/** The accounts customers are told to pay into. */
export function PaymentAccountTable() {
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
  const kindFilter = filters.kind;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IPaymentAccountListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
      ...(kindFilter !== "all"
        ? { kind: kindFilter as PaymentAccountKind }
        : {}),
    }),
    [page, pageSize, search, statusFilter, kindFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetPaymentAccountsQuery(queryArgs);
  const accounts = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount =
    (statusFilter !== "all" ? 1 : 0) + (kindFilter !== "all" ? 1 : 0);
  const filtered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && accounts.length === 0 && !filtered;

  const columns = useMemo<ColumnDef<IPaymentAccount, unknown>[]>(
    () => [
      {
        id: "account",
        accessorFn: (a) => `${a.label} ${a.accountName}`,
        header: "Account",
        enableSorting: false,
        meta: columnMeta({ card: "title", stretch: true }),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <Link
              href={`${LIST}/${a.id}`}
              className="block min-w-0 @2xl/table:max-w-[90%] outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="block [overflow-wrap:anywhere] @2xl/table:truncate font-medium text-adm-ink">
                {a.label}
              </span>
              <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
                {a.accountName}
              </span>
            </Link>
          );
        },
      },
      {
        id: "number",
        accessorFn: (a) => a.accountNumber,
        header: "Number",
        enableSorting: false,
        meta: columnMeta({ card: "meta" }),
        cell: ({ row }) => (
          <span className="font-adminmono block [overflow-wrap:anywhere] @2xl/table:truncate text-adm-ink">
            {row.original.accountNumber}
          </span>
        ),
      },
      {
        id: "where",
        accessorFn: (a) => a.bankName ?? a.provider ?? "",
        header: "Bank / network",
        enableSorting: false,
        meta: columnMeta({ card: "meta", wide: true }),
        cell: ({ row }) => {
          const a = row.original;
          const where = a.bankName ?? a.provider;
          if (!where) return <Absent />;
          return (
            <span className="block @2xl/table:min-w-[8rem] @2xl/table:max-w-[20rem]">
              <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-adm-ink">
                {where}
              </span>
              <span className="block [overflow-wrap:anywhere] @2xl/table:truncate text-[12.5px] text-adm-faint">
                {KIND_LABEL[a.kind]}
                {a.branch ? ` · ${a.branch}` : ""}
              </span>
            </span>
          );
        },
      },
      {
        id: "printed",
        header: columnHelp(
          "On invoices",
          "Whether this account is printed on invoices for customers to pay into, or kept internal.",
        ),
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) =>
          row.original.showOnInvoice ? (
            <span className="text-adm-ink">Printed</span>
          ) : (
            <span className="text-adm-faint">Internal only</span>
          ),
      },
      {
        id: "status",
        header: "Status",
        enableSorting: false,
        meta: columnMeta({ card: "badge" }),
        cell: ({ row }) => <ActiveBadge isActive={row.original.isActive} />,
      },
    ],
    [],
  );

  return (
    <div>
      <AdminPageHeader
        title="Payment accounts"
        sub="Where customers send money. These print on invoices and statements"
      />

      {pristine || (isError && !filtered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search account…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="accounts"
          action={
            <AdminButton asChild aria-label="Add account">
              <Link href={`${LIST}/new`}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add account</span>
              </Link>
            </AdminButton>
          }
          chips={
            <>
              {kindFilter !== "all" ? (
                <FilterChip onRemove={() => setFilter("kind", "all")}>
                  Kind: {labelOf(KIND_FILTER_OPTIONS, kindFilter)}
                </FilterChip>
              ) : null}
              {statusFilter !== "all" ? (
                <FilterChip onRemove={() => setFilter("status", "all")}>
                  Status: {labelOf(STATUS_FILTER_OPTIONS, statusFilter)}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleLabeledSelect
            label="Kind"
            value={kindFilter}
            onChange={(v) => setFilter("kind", v)}
            options={KIND_FILTER_OPTIONS}
            active={kindFilter !== "all"}
          />
          <ConsoleLabeledSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setFilter("status", v)}
            options={STATUS_FILTER_OPTIONS}
            active={statusFilter !== "all"}
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
      ) : accounts.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="accounts"
          title="No payment accounts yet"
          description="Add the bank accounts and mobile-money numbers customers should pay into. Until one exists, invoices cannot tell a buyer where to send money."
          actionLabel="Add your first account"
          onAction={() => router.push(`${LIST}/new`)}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IPaymentAccount>
            columns={columns}
            data={accounts}
            itemNoun="accounts"
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

function PaymentAccountFormFields({ account }: { account?: IPaymentAccount }) {
  const router = useRouter();
  const isEdit = account !== undefined;
  const [createAccount, createState] = useCreatePaymentAccountMutation();
  const [updateAccount, updateState] = useUpdatePaymentAccountMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Always editable. The account has a detail page of its own, so a locked
  // copy of it here would be a second click before the page does the one thing
  // it is for.

  const {
    register,
    handleSubmit,
    setError,
    watch,
    control,
    formState: { errors },
  } = useForm<PaymentAccountFormValues>({
    resolver: zodResolver(paymentAccountSchema),
    defaultValues: {
      label: account?.label ?? "",
      kind: account?.kind ?? "BANK",
      accountName: account?.accountName ?? "",
      accountNumber: account?.accountNumber ?? "",
      bankName: account?.bankName ?? "",
      branch: account?.branch ?? "",
      sortCode: account?.sortCode ?? "",
      swiftCode: account?.swiftCode ?? "",
      provider: account?.provider ?? "",
      instructions: account?.instructions ?? "",
      isActive: account?.isActive ?? true,
      showOnInvoice: account?.showOnInvoice ?? true,
      sortOrder: account?.sortOrder ?? 0,
    },
  });

  // Which extra fields matter follows the kind, so the form only ever asks
  // for what the payer will actually be told.
  const kind = watch("kind");
  const isBank = kind === "BANK";
  const isMomo = kind === "MOMO";

  const onSubmit = async (values: PaymentAccountFormValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateAccount({
          id: account.id,
          body: {
            label: values.label,
            kind: values.kind,
            accountName: values.accountName,
            accountNumber: values.accountNumber,
            bankName: opt(values.bankName),
            branch: opt(values.branch),
            sortCode: opt(values.sortCode),
            swiftCode: opt(values.swiftCode),
            provider: opt(values.provider),
            instructions: opt(values.instructions),
            isActive: values.isActive,
            showOnInvoice: values.showOnInvoice,
            sortOrder: values.sortOrder,
          },
        }).unwrap();
        notify.success("Payment account updated");
        router.push(`${LIST}/${account.id}`);
      } else {
        const res = await createAccount({
          label: values.label,
          kind: values.kind,
          accountName: values.accountName,
          accountNumber: values.accountNumber,
          ...(values.bankName?.trim()
            ? { bankName: values.bankName.trim() }
            : {}),
          ...(values.branch?.trim() ? { branch: values.branch.trim() } : {}),
          ...(values.sortCode?.trim()
            ? { sortCode: values.sortCode.trim() }
            : {}),
          ...(values.swiftCode?.trim()
            ? { swiftCode: values.swiftCode.trim() }
            : {}),
          ...(values.provider?.trim()
            ? { provider: values.provider.trim() }
            : {}),
          ...(values.instructions?.trim()
            ? { instructions: values.instructions.trim() }
            : {}),
          isActive: values.isActive,
          showOnInvoice: values.showOnInvoice,
          sortOrder: values.sortOrder,
        }).unwrap();
        notify.success("Payment account added");
        router.replace(`${LIST}/${res.data.account.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "label",
          "kind",
          "accountName",
          "accountNumber",
          "bankName",
          "branch",
          "sortCode",
          "swiftCode",
          "provider",
          "instructions",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the account" : "Couldn't save the account",
        { description: message },
      );
    }
  };

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
          <div className="grid gap-5 @min-[440px]:grid-cols-2">
            <AdminField
              label="Label"
              hint="What staff call it internally, e.g. 'Ecobank - main operating'."
              error={errors.label?.message}
            >
              <Input
                placeholder="e.g. Ecobank - main operating"
                className={cn(
                  adminInputClass,
                  errors.label && "border-console-red",
                )}
                {...register("label")}
              />
            </AdminField>
            <AdminField
              label="Kind"
              hint="What sort of account this is: a bank account, or a mobile money wallet."
              error={errors.kind?.message}
            >
              <Controller
                control={control}
                name="kind"
                render={({ field }) => (
                  <SimpleSelect
                    className={cn(
                      adminInputClass,
                      errors.kind && "border-console-red",
                    )}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose bank or mobile money"
                    options={KIND_OPTIONS}
                  />
                )}
              />
            </AdminField>
          </div>

        </section>

        <section className="flex flex-col gap-5">
          <AdminField
            label="Account name"
            hint="The name the money must be sent to. A payer is asked to confirm this."
            error={errors.accountName?.message}
          >
            <Input
              placeholder="e.g. DB Plus Trading Ltd"
              className={cn(
                adminInputClass,
                errors.accountName && "border-console-red",
              )}
              {...register("accountName")}
            />
          </AdminField>

          <AdminField
            label={isMomo ? "MoMo number" : "Account number"}
            error={errors.accountNumber?.message}
          >
            <Input
              inputMode={isMomo ? "tel" : "numeric"}
              placeholder={isMomo ? "e.g. 024 000 0000" : "e.g. 1234567890123"}
              className={cn(
                adminInputClass,
                "font-adminmono",
                errors.accountNumber && "border-console-red",
              )}
              {...register("accountNumber")}
            />
          </AdminField>

          {isBank ? (
            <>
              <div className="grid gap-5 @min-[440px]:grid-cols-2">
                <AdminField label="Bank" error={errors.bankName?.message}>
                  <Input
                    placeholder="e.g. Ecobank Ghana"
                    className={cn(
                      adminInputClass,
                      errors.bankName && "border-console-red",
                    )}
                    {...register("bankName")}
                  />
                </AdminField>
                <AdminField
                  label="Branch"
                  optional
                  error={errors.branch?.message}
                >
                  <Input
                    placeholder="e.g. Tamale Main"
                    className={cn(
                      adminInputClass,
                      errors.branch && "border-console-red",
                    )}
                    {...register("branch")}
                  />
                </AdminField>
              </div>
              <div className="grid gap-5 @min-[440px]:grid-cols-2">
                <AdminField
                  label="Sort code"
                  optional
                  error={errors.sortCode?.message}
                >
                  <Input
                    placeholder="e.g. 130101"
                    className={cn(
                      adminInputClass,
                      "font-adminmono",
                      errors.sortCode && "border-console-red",
                    )}
                    {...register("sortCode")}
                  />
                </AdminField>
                <AdminField
                  label="SWIFT"
                  optional
                  hint="Only needed for transfers from outside Ghana."
                  error={errors.swiftCode?.message}
                >
                  <Input
                    placeholder="e.g. ECOCGHAC"
                    className={cn(
                      adminInputClass,
                      "font-adminmono",
                      errors.swiftCode && "border-console-red",
                    )}
                    {...register("swiftCode")}
                  />
                </AdminField>
              </div>
            </>
          ) : null}

          {isMomo ? (
            <AdminField label="Network" error={errors.provider?.message}>
              <Input
                placeholder="e.g. MTN"
                className={cn(
                  adminInputClass,
                  errors.provider && "border-console-red",
                )}
                {...register("provider")}
              />
            </AdminField>
          ) : null}

        </section>

        <section className="flex flex-col gap-5">
          <AdminField
            label="Instructions"
            optional
            hint="Printed under the account on invoices. The document number is already added automatically."
            error={errors.instructions?.message}
          >
            <textarea
              rows={4}
              placeholder="e.g. Transfers only, no cash deposits at the counter."
              className={cn(
                adminInputClass,
                "h-auto min-h-[64px] w-full resize-y py-2",
                errors.instructions && "border-console-red",
              )}
              {...register("instructions")}
            />
          </AdminField>

          <AdminField
            label="Order"
            hint="Lower numbers print first on an invoice."
            error={errors.sortOrder?.message}
          >
            <Input
              type="number"
              min={0}
              placeholder="e.g. 10"
              className={cn(
                adminInputClass,
                "max-w-[120px]",
                errors.sortOrder && "border-console-red",
              )}
              {...register("sortOrder", { valueAsNumber: true })}
            />
          </AdminField>

          <label className="flex items-center gap-2 text-[13px] text-adm-ink">
            <input type="checkbox" {...register("showOnInvoice")} />
            Print this account on invoices and statements
          </label>
          <label className="flex items-center gap-2 text-[13px] text-adm-ink">
            <input type="checkbox" {...register("isActive")} />
            Active
          </label>
        </section>

        <div className="pt-3 sm:pt-6">
          {/* Never "locked" - this route has no locked state. Cancel returns
              to the record, which is where it is read. */}
          <EditableFormActions
            mode={isEdit ? "editing" : "create"}
            saving={saving}
            createLabel="Save account"
            editLabel="Edit account"
            onEdit={() => undefined}
            onCancel={() =>
              router.push(isEdit && account ? `${LIST}/${account.id}` : LIST)
            }
          />
        </div>
      </form>
    </AdminCard>
  );
}

export function PaymentAccountCreate() {
  return (
    <div className="max-w-[560px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Accounts", href: LIST }]}
        current="Add payment account"
      />
      <DetailHeader
        title="Add payment account"
        hint="A bank or mobile money account your customers pay into."
        sub="A destination customers send money to"
      />
      <PaymentAccountFormFields />
    </div>
  );
}

export function PaymentAccountEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } =
    useGetPaymentAccountQuery(id);
  const [activate] = useActivatePaymentAccountMutation();
  const [deactivate] = useDeactivatePaymentAccountMutation();
  const [remove] = useDeletePaymentAccountMutation();

  if (isLoading) return <FormSkeleton fields={8} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const account = data.data.account;
  return (
    // Back to the account's detail page (facts + movement history), not the
    // register - editing is reached from there.
    <RecordShell
      backHref={`${LIST}/${id}`}
      backLabel="Account details"
      crumbs={[
        DASHBOARD_CRUMB,
        { label: "Accounts", href: LIST },
        { label: "Account details", href: `${LIST}/${id}` },
      ]}
      current="Payment account details"
      header={
        <DetailHeader
          title="Payment account details"
          hint="One account customers pay into, and everything received through it."
        />
      }
      aside={
        <>
          <RailStatus isActive={account.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={account.createdAt}
              updatedAt={account.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="payment account"
              name={account.label}
              isActive={account.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <PaymentAccountFormFields key={account.updatedAt} account={account} />
    </RecordShell>
  );
}
