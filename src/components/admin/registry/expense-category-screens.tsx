"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { ConsoleFilterBar, ConsoleLabeledSelect } from "@/components/admin/filter-bar";
import {
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  Mono,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  useActivateExpenseCategoryMutation,
  useCreateExpenseCategoryMutation,
  useDeactivateExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetExpenseCategoriesQuery,
  useGetExpenseCategoryQuery,
  useUpdateExpenseCategoryMutation,
} from "@/redux/expense-categories/expense-categories-api";
import { useGetExpensesQuery } from "@/redux/expenses/expenses-api";
import { useTableQuery } from "@/hooks/use-table-query";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { extractApiError } from "@/lib/extract-api-error";
import { DateOnlyCell, DateTimeCell } from "@/components/admin/date-cell";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IExpense } from "@/types/expense.types";
import type {
  IExpenseCategory,
  IRegistryListQuery,
} from "@/types/registry.types";
import {
  expenseCategorySchema,
  type ExpenseCategoryValues,
} from "@/validations/registry-schema";
import { LifecycleActions } from "./lifecycle-actions";
import {
  Absent,
  ActiveBadge,
  columnMeta,
  STATUS_FILTER_OPTIONS,
  statusToQuery,
  type StatusFilter,
} from "./registry-bits";

const LIST = "/admin/expense-categories";
const FILTER_DEFAULTS = { status: "all", size: "10" };

/** The live Expense Categories register. */
export function ExpenseCategoryTable() {
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
  // Only the owner edits this vocabulary (design doc 4).
  const { isSuperAdmin } = useAuthRole();

  const statusFilter = filters.status as StatusFilter;
  const pageSize = Number(filters.size) || 10;
  const search = (queryParams.search as string | undefined) ?? "";

  const queryArgs = useMemo<IRegistryListQuery>(
    () => ({
      page,
      limit: pageSize,
      ...(search ? { search } : {}),
      ...statusToQuery(statusFilter),
    }),
    [page, pageSize, search, statusFilter],
  );

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetExpenseCategoriesQuery(queryArgs);
  const categories = data?.data ?? [];
  const totalCount = data?.meta.total ?? 0;
  const activeFilterCount = statusFilter !== "all" ? 1 : 0;

  const columns = useMemo<ColumnDef<IExpenseCategory, unknown>[]>(
    () => [
      {
        id: "name",
        accessorFn: (c) => c.name,
        header: "Category",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Link
            href={`${LIST}/${row.original.id}`}
            className="block truncate font-medium text-ink outline-none focus-visible:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: "added",
        accessorFn: (c) => c.createdAt,
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
          Expense Categories
        </h1>
        <p className="mt-0.5 text-[13px] text-soil">
          The vocabulary every recorded expense is filed under
        </p>
      </div>

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search category…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            isSuperAdmin ? (
              <Button asChild variant="harvest" className="h-8 px-3.5 text-[13px]">
                <Link href={`${LIST}/new`}>+ Add category</Link>
              </Button>
            ) : null
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
      ) : categories.length === 0 ? (
        <AdminCard className="overflow-hidden">
          {search || activeFilterCount > 0 ? (
            <EmptyState
              variant="plain"
              title="No matching categories"
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
              title="No expense categories yet"
              description="Add the first category expenses will be filed under - transport, loading, commission."
              actionLabel="Add your first category"
              onAction={() => router.push(`${LIST}/new`)}
            />
          )}
        </AdminCard>
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IExpenseCategory>
            columns={columns}
            data={categories}
            itemNoun="categories"
            isFetching={isFetching}
            serverPagination={{
              totalCount,
              page,
              pageSize,
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
            }}
            rowHref={(c) => `${LIST}/${c.id}`}
            rowClassName={() => "h-12 hover:bg-surface-alt/60"}
          />
        </AdminCard>
      )}
    </div>
  );
}

function ExpenseCategoryFormFields({
  category,
}: {
  category?: IExpenseCategory;
}) {
  const router = useRouter();
  const isEdit = category !== undefined;
  const [createCategory, createState] = useCreateExpenseCategoryMutation();
  const [updateCategory, updateState] = useUpdateExpenseCategoryMutation();
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
  } = useForm<ExpenseCategoryValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: { name: category?.name ?? "" },
  });

  // A background refetch can bump the record (another tab, a lifecycle
  // action). Track the fresh values while reading, but never clobber an
  // in-progress edit - which is why the parent does not key-remount the form
  // on updatedAt.
  useEffect(() => {
    if (!isEditing) reset({ name: category?.name ?? "" });
  }, [category, isEditing, reset]);

  const onSubmit = async (values: ExpenseCategoryValues) => {
    try {
      if (isEdit) {
        await updateCategory({
          id: category.id,
          body: { name: values.name },
        }).unwrap();
        notify.success("Category updated");
        setIsEditing(false);
      } else {
        const res = await createCategory({ name: values.name }).unwrap();
        notify.success("Category created");
        router.replace(`${LIST}/${res.data.expenseCategory.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors?.name) {
        setError("name", { message: fieldErrors.name });
      }
      notify.error(
        isEdit ? "Couldn't update the category" : "Couldn't create the category",
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
            placeholder="e.g. Transport"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-error")}
            {...register("name")}
          />
        </AdminField>
        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Create category"
          editLabel="Edit category"
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

export function ExpenseCategoryCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All categories" className="mb-2" />
      <AdminPageHeader
        title="Add expense category"
        sub="A bucket expenses are filed under in reports"
      />
      <ExpenseCategoryFormFields />
    </div>
  );
}

/**
 * The expenses filed under this category - proof of what the bucket actually
 * holds, with the whole-window total the backend aggregates server-side.
 */
function CategoryExpensesCard({ categoryId }: { categoryId: string }) {
  const showMoney = useMoneyVisibility();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetExpensesQuery({ categoryId, limit: 10, page });

  const columns = useMemo<ColumnDef<IExpense, unknown>[]>(
    () => [
      {
        accessorKey: "transactionNo",
        header: "Voucher",
        enableSorting: false,
        cell: ({ row }) => <Mono>{row.original.transactionNo}</Mono>,
        meta: { className: "px-4 text-[13px]" },
      },
      {
        accessorFn: (r) => r.incurredAt,
        id: "incurredAt",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => <DateOnlyCell value={row.original.incurredAt} />,
        meta: { className: "px-4 text-[13px] whitespace-nowrap" },
      },
      {
        accessorFn: (r) => r.description ?? "",
        id: "description",
        header: "Description",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.description ? (
            <span
              className="block max-w-[220px] truncate"
              title={row.original.description}
            >
              {row.original.description}
            </span>
          ) : (
            <Absent />
          ),
        meta: { className: "px-4 text-[13px]" },
      },
      ...(showMoney
        ? [
            {
              accessorFn: (r: IExpense) => r.amountGhs ?? 0,
              id: "amountGhs",
              header: "Amount",
              enableSorting: false,
              cell: ({ row }: { row: { original: IExpense } }) => (
                <Mono>{formatCedis(row.original.amountGhs)}</Mono>
              ),
              meta: { className: "px-4 text-right text-[13px]" },
            } as ColumnDef<IExpense, unknown>,
          ]
        : []),
    ],
    [showMoney],
  );

  const rows = data?.data ?? [];
  const windowTotal = data?.summary?.totalGhs;

  return (
    <div className="mt-5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-ink">
          Expenses in this category
        </h2>
        {showMoney && windowTotal !== null && windowTotal !== undefined ? (
          <span className="flex items-baseline gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
              Total
            </span>
            <Mono className="text-[14px] font-bold text-ink">
              {formatCedis(windowTotal)}
            </Mono>
          </span>
        ) : null}
      </div>

      {isLoading ? (
        <DataTableSkeleton />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : (
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IExpense>
            columns={columns}
            data={rows}
            itemNoun="expenses"
            isFetching={isFetching}
            serverPagination={{
              totalCount: data?.meta.total ?? 0,
              page,
              pageSize: 10,
              onPageChange: setPage,
              onPageSizeChange: () => undefined,
            }}
            emptyState={
              <EmptyState
                variant="plain"
                title="No expenses yet"
                description="Nothing has been filed under this category so far."
              />
            }
          />
        </AdminCard>
      )}
    </div>
  );
}

export function ExpenseCategoryEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } =
    useGetExpenseCategoryQuery(id);
  const [activate] = useActivateExpenseCategoryMutation();
  const [deactivate] = useDeactivateExpenseCategoryMutation();
  const [remove] = useDeleteExpenseCategoryMutation();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const category = data.data.expenseCategory;
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All categories" className="mb-2" />
      <AdminPageHeader
        title={category.name}
        sub="Edit the category and its lifecycle"
      />
      <ExpenseCategoryFormFields category={category} />
      <CategoryExpensesCard categoryId={id} />
      <LifecycleActions
        noun="category"
        name={category.name}
        isActive={category.isActive}
        listHref={LIST}
        onActivate={() => activate(id).unwrap()}
        onDeactivate={() => deactivate(id).unwrap()}
        onDelete={() => remove(id).unwrap()}
      />
    </div>
  );
}
