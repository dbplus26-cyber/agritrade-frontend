"use client";

import { useMemo, useState } from "react";
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
  adminInputClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { ConsoleTableSkeleton, FormSkeleton } from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
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

  const columns = useMemo<ColumnDef<IPaymentAccount, unknown>[]>(
    () => [
      {
        id: "account",
        accessorFn: (a) => `${a.label} ${a.accountName}`,
        header: "Account",
        enableSorting: false,
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => {
          const a = row.original;
          return (
            <Link
              href={`${LIST}/${a.id}`}
              className="block min-w-[9rem] max-w-[90%] outline-none focus-visible:underline"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="block truncate font-medium text-adm-ink">
                {a.label}
              </span>
              <span className="block truncate text-[11.5px] text-adm-faint">
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
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="font-adminmono block truncate text-[12.5px] text-adm-ink">
            {row.original.accountNumber}
          </span>
        ),
      },
      {
        id: "where",
        accessorFn: (a) => a.bankName ?? a.provider ?? "",
        header: "Bank / network",
        enableSorting: false,
        meta: columnMeta({ wide: true }),
        cell: ({ row }) => {
          const a = row.original;
          const where = a.bankName ?? a.provider;
          if (!where) return <Absent />;
          return (
            <span className="block min-w-[8rem] max-w-[20rem]">
              <span className="block truncate text-[12.5px] text-adm-ink">
                {where}
              </span>
              <span className="block truncate text-[11.5px] text-adm-faint">
                {KIND_LABEL[a.kind]}
                {a.branch ? ` · ${a.branch}` : ""}
              </span>
            </span>
          );
        },
      },
      {
        id: "printed",
        header: "On invoices",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) =>
          row.original.showOnInvoice ? (
            <span className="text-[12.5px] text-adm-ink">Printed</span>
          ) : (
            <span className="text-[12.5px] text-adm-faint">Internal only</span>
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
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Payment accounts
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
          Where customers send money. These print on invoices and statements
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search account…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
              <Link href={`${LIST}/new`}>+ Add account</Link>
            </Button>
          }
        >
          <ConsoleLabeledSelect
            label="Kind"
            value={kindFilter}
            onChange={(v) => setFilter("kind", v)}
            options={KIND_FILTER_OPTIONS}
            active={kindFilter !== "all"}
            className="lg:w-[160px]"
          />
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
        <ConsoleTableSkeleton columns={5} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : accounts.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching accounts"
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
              title="No payment accounts yet"
              description="Add the bank accounts and mobile-money numbers customers should pay into. Until one exists, invoices cannot tell a buyer where to send money."
              actionLabel="Add your first account"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
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

  // Edit screens open READ-ONLY; the Edit button unlocks the inputs. An
  // account number is the one field where a slip redirects every future
  // payment, so it is never a click away from being changed.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
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
        setIsEditing(false);
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && account) {
    return (
      <AdminCard className="px-5 py-[18px]">
        <RecordFacts
          facts={[
            { label: "Label", value: account.label },
            { label: "Kind", value: account.kind },
            { label: "Account name", value: account.accountName },
            { label: "Account number", mono: true, value: account.accountNumber },
            { label: "Bank", value: account.bankName },
            { label: "Branch", value: account.branch },
            { label: "Sort code", mono: true, value: account.sortCode },
            { label: "SWIFT", mono: true, value: account.swiftCode },
            { label: "Network", value: account.provider },
            { label: "Order", value: String(account.sortOrder) },
            {
              label: "On invoices",
              value: account.showOnInvoice ? "Printed" : "Internal only",
            },
            { full: true, label: "Instructions", value: account.instructions },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit account
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
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Label"
            hint="What staff call it internally, e.g. 'Ecobank - main operating'."
            error={errors.label?.message}
          >
            <Input
              placeholder="e.g. Ecobank - main operating"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.label && "border-console-red",
              )}
              {...register("label")}
            />
          </AdminField>
          <AdminField label="Kind" error={errors.kind?.message}>
            <select
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.kind && "border-console-red",
              )}
              {...register("kind")}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminField>
        </div>

        <AdminField
          label="Account name"
          hint="The name the money must be sent to. A payer is asked to confirm this."
          error={errors.accountName?.message}
        >
          <Input
            placeholder="e.g. DB Plus Trading Ltd"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
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
            placeholder={isMomo ? "024 000 0000" : "1234567890123"}
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "font-adminmono",
              errors.accountNumber && "border-console-red",
            )}
            {...register("accountNumber")}
          />
        </AdminField>

        {isBank ? (
          <>
            <div className="grid gap-[13px] sm:grid-cols-2">
              <AdminField label="Bank" error={errors.bankName?.message}>
                <Input
                  placeholder="e.g. Ecobank Ghana"
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
                label="Branch"
                optional
                error={errors.branch?.message}
              >
                <Input
                  placeholder="e.g. Tamale Main"
                  disabled={readOnly}
                  className={cn(
                    adminInputClass,
                    roCls,
                    errors.branch && "border-console-red",
                  )}
                  {...register("branch")}
                />
              </AdminField>
            </div>
            <div className="grid gap-[13px] sm:grid-cols-2">
              <AdminField
                label="Sort code"
                optional
                error={errors.sortCode?.message}
              >
                <Input
                  disabled={readOnly}
                  className={cn(
                    adminInputClass,
                    roCls,
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
                  disabled={readOnly}
                  className={cn(
                    adminInputClass,
                    roCls,
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
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.provider && "border-console-red",
              )}
              {...register("provider")}
            />
          </AdminField>
        ) : null}

        <AdminField
          label="Instructions"
          optional
          hint="Printed under the account on invoices. The document number is already added automatically."
          error={errors.instructions?.message}
        >
          <textarea
            rows={4}
            placeholder="e.g. Transfers only, no cash deposits at the counter."
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
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
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "max-w-[120px]",
              errors.sortOrder && "border-console-red",
            )}
            {...register("sortOrder", { valueAsNumber: true })}
          />
        </AdminField>

        <label
          className={cn(
            "flex items-center gap-2 text-[13px] text-adm-ink",
            readOnly && "cursor-default",
          )}
        >
          <input
            type="checkbox"
            disabled={readOnly}
            className={roCls}
            {...register("showOnInvoice")}
          />
          Print this account on invoices and statements
        </label>
        <label
          className={cn(
            "flex items-center gap-2 text-[13px] text-adm-ink",
            readOnly && "cursor-default",
          )}
        >
          <input
            type="checkbox"
            disabled={readOnly}
            className={roCls}
            {...register("isActive")}
          />
          Active
        </label>

        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Save account"
          editLabel="Edit account"
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

export function PaymentAccountCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All accounts" className="mb-2" />
      <AdminPageHeader
        title="Add payment account"
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
      header={
        <AdminPageHeader
          title={account.label}
          sub="Payment account record"
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
