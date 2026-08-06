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
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  DetailShell,
  EditableFormActions,
  Mono,
  adminInputClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import {
  ConsoleTableSkeleton,
  FormSkeleton,
  LedgerSkeleton,
} from "@/components/admin/skeletons";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListPagination } from "@/components/ui/ListPagination";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
import { TitleCell } from "@/components/admin/table-cells";

const LIST = "/admin/expense-categories";
const FILTER_DEFAULTS = { status: "all", size: "10" };

/** The live Expense Categories register. */

/**
 * Creating a category is two short fields, so it opens over the register
 * rather than sending the user to a page of its own and back. The edit screen
 * stays a page: that one doubles as the category's read view.
 */
function CreateCategoryDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [createCategory, { isLoading }] = useCreateExpenseCategoryMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseCategoryValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: { description: "", name: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: ExpenseCategoryValues) => {
    const description = values.description?.trim() ?? "";
    try {
      await createCategory({
        name: values.name,
        ...(description ? { description } : {}),
      }).unwrap();
      notify.success("Category created");
      close();
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors?.name) {
        setError("name", { message: fieldErrors.name });
      }
      notify.error("Couldn't create the category", { description: message });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent className="sm:max-w-[440px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Add expense category</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The heading costs are filed under. Keep the list short - it is what
            every expense report groups by.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-[13px]"
        >
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              autoFocus
              placeholder="e.g. Transport"
              className={cn(adminInputClass, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <AdminField
            label="Description"
            optional
            hint="What belongs here, so two staff file the same cost the same way."
            error={errors.description?.message}
          >
            <textarea
              rows={4}
              placeholder="e.g. Fuel, tolls and truck hire for deliveries"
              className={cn(
                adminInputClass,
                "h-auto min-h-[62px] w-full resize-y py-2",
                errors.description && "border-console-red",
              )}
              {...register("description")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-3.5"
              onClick={close}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Saving…" : "Create category"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function ExpenseCategoryTable() {
  const [createOpen, setCreateOpen] = useState(false);
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
        meta: columnMeta({ stretch: true }),
        // What belongs in the category rides under its name instead of
        // holding a column: prose has no natural width, so on its own it is
        // always the column that pushes the table sideways.
        cell: ({ row }) => (
          <TitleCell
            href={`${LIST}/${row.original.id}`}
            meta={row.original.description}
            title={row.original.name}
            stretch
          />
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
        <h1 className="text-[22px] font-bold tracking-[-0.01em] text-adm-ink">
          Expense Categories
        </h1>
        <p className="mt-0.5 text-[13px] text-adm-muted">
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
              <Button
                variant="default"
                className="h-[34px] rounded-[6px] bg-console px-3.5 text-[13px] font-semibold text-white shadow-none hover:translate-x-0 hover:translate-y-0 hover:bg-console-hover hover:shadow-none"
                onClick={() => setCreateOpen(true)}
              >
                + Add category
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
        <ConsoleTableSkeleton columns={4} />
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
              onAction={() => setCreateOpen(true)}
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
            rowClassName={() => "h-12 hover:bg-adm-sunken"}
          />
        </AdminCard>
      )}
      <CreateCategoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
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
    defaultValues: {
      description: category?.description ?? "",
      name: category?.name ?? "",
    },
  });

  // A background refetch can bump the record (another tab, a lifecycle
  // action). Track the fresh values while reading, but never clobber an
  // in-progress edit - which is why the parent does not key-remount the form
  // on updatedAt.
  useEffect(() => {
    if (!isEditing)
      reset({
        description: category?.description ?? "",
        name: category?.name ?? "",
      });
  }, [category, isEditing, reset]);

  const onSubmit = async (values: ExpenseCategoryValues) => {
    try {
      // Empty clears the column on an edit; on a create it is simply omitted.
      const description = values.description?.trim() ?? "";
      if (isEdit) {
        await updateCategory({
          id: category.id,
          body: { description: description || null, name: values.name },
        }).unwrap();
        notify.success("Category updated");
        setIsEditing(false);
      } else {
        const res = await createCategory({
          name: values.name,
          ...(description ? { description } : {}),
        }).unwrap();
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && category) {
    return (
      <AdminCard className="px-5 py-[18px]">
        <RecordFacts
          facts={[
            { label: "Name", value: category.name },
            { full: true, label: "Description", value: category.description },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit category
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
        <AdminField label="Name" error={errors.name?.message}>
          <Input
            placeholder="e.g. Transport"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
            {...register("name")}
          />
        </AdminField>
        <AdminField
          label="Description"
          optional
          hint="What belongs under this heading, so two staff file the same cost the same way."
          error={errors.description?.message}
        >
          <textarea
            rows={4}
            placeholder="e.g. Fuel, tolls and truck hire for deliveries"
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "h-auto min-h-[62px] w-full resize-y py-2",
              errors.description && "border-console-red",
            )}
            {...register("description")}
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
/**
 * One cost, as a statement line.
 *
 * What it says leads, because that is what anybody reading this list is
 * looking for; the voucher number and the date follow as the quiet line that
 * lets it be found on paper; and the amount holds the right edge, never
 * truncating and never wrapping, so a column of figures stays a column.
 */
function ExpenseLine({ expense }: { expense: IExpense }) {
  const showMoney = useMoneyVisibility();
  return (
    <li className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-[1.45] text-adm-ink [overflow-wrap:anywhere]">
          {expense.description ?? <Absent />}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11.5px] text-adm-muted">
          <Mono className="text-[11.5px]">{expense.transactionNo}</Mono>
          <span aria-hidden="true" className="text-adm-faint">
            ·
          </span>
          <DateOnlyCell value={expense.incurredAt} muted />
        </p>
      </div>
      {showMoney ? (
        <Mono className="flex-none text-[13.5px] font-semibold tabular-nums text-adm-ink">
          {formatCedis(expense.amountGhs)}
        </Mono>
      ) : null}
    </li>
  );
}

/**
 * The expenses filed under this category - proof of what the bucket actually
 * holds, with the whole-window total the backend aggregates server-side.
 *
 * A STATEMENT, not a gallery. These were voucher tiles in a two-or-three
 * column grid, which reads fine at twelve and badly at one: a category with a
 * single expense put one small tile in the first cell and left the other two
 * columns empty, next to a side rail three times its height. The gap was the
 * layout telling the truth about a grid with nothing to fill it.
 *
 * A costs list is a ledger, and a ledger is rows. One row spans the full
 * width, so one expense looks deliberate and twelve look like a statement;
 * the figures line up in a single right-hand column where they can be
 * compared, which tiles never allowed; and the count no longer changes the
 * shape of the page.
 */
function CategoryExpensesCard({ categoryId }: { categoryId: string }) {
  const showMoney = useMoneyVisibility();
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetExpensesQuery({ categoryId, limit: 12, page });

  const rows = data?.data ?? [];
  const windowTotal = data?.summary?.totalGhs;
  const totalPages = Math.max(1, Math.ceil((data?.meta.total ?? 0) / 12));

  return (
    // Fills the column so the statement ends where the record rail beside it
    // does. A category with one expense left a short card at the top of the
    // left column with the rail running past it - the same imbalance the tile
    // grid had, in a different shape.
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-[15px] font-bold tracking-[-0.01em] text-adm-ink">
          Expenses in this category
        </h2>
        {showMoney && windowTotal !== null && windowTotal !== undefined ? (
          <span className="flex items-baseline gap-2">
            <span className="text-[11px] font-bold tracking-[0.08em] text-adm-muted uppercase">
              Total
            </span>
            <Mono className="text-[14px] font-bold text-adm-ink">
              {formatCedis(windowTotal)}
            </Mono>
          </span>
        ) : null}
      </div>

      {isLoading ? (
        // A ledger skeleton, matching what actually arrives. A card-grid
        // skeleton here promised tiles and then delivered rows, which is a
        // visible jump on every load.
        <AdminCard className="overflow-hidden px-4">
          <LedgerSkeleton rows={6} />
        </AdminCard>
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No expenses yet"
            description="Nothing has been filed under this category so far."
          />
        </AdminCard>
      ) : (
        <>
          <AdminCard className="flex-1 overflow-hidden">
            {/* divide-y, not a border per row: the hairline belongs BETWEEN
                lines, so the last one has no rule under it running into the
                card's own edge. */}
            <ul
              className={cn(
                "divide-y divide-adm-hairline transition-opacity",
                isFetching && "pointer-events-none opacity-60",
              )}
              aria-busy={isFetching || undefined}
            >
              {rows.map((expense) => (
                <ExpenseLine key={expense.id} expense={expense} />
              ))}
            </ul>
          </AdminCard>
          <ListPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="mt-3"
          />
        </>
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

  if (isLoading) return <FormSkeleton fields={2} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const category = data.data.expenseCategory;
  return (
    <div className="max-w-[1180px]">
      <BackButton href={LIST} label="All categories" className="mb-2" />
      <AdminPageHeader
        title="Expense category details"
        sub="What this heading covers, and every cost filed under it"
      />
      {/* The record is two short fields; the spend under it is the page's
          substance, so the record takes the rail and the vouchers take the
          width. On a phone the rail stacks first - you came here to edit. */}
      <DetailShell
        main={<CategoryExpensesCard categoryId={id} />}
        aside={
          <div className="flex flex-col gap-4">
            <ExpenseCategoryFormFields category={category} />
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
        }
      />
    </div>
  );
}
