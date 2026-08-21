"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { Plus } from "lucide-react";
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
  DetailShell,
  EditableFormActions,
  Mono,
  SectionHeading,
  adminInputClass,
  adminLinkClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { CategoryStatementFields } from "@/components/admin/registry/category-statement-fields";
import { statementSectionLabel } from "@/lib/statement-section";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import {
  ConsoleTableSkeleton,
  FormSkeleton,
  LedgerSkeleton,
} from "@/components/admin/skeletons";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
import { useAuthRole } from "@/hooks/use-auth-role";
import { usePermissions } from "@/hooks/use-permissions";
import { useTableQuery } from "@/hooks/use-table-query";
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
    control,
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ExpenseCategoryValues>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: {
      description: "",
      name: "",
      statementHeading: "",
      statementSection: "ADMINISTRATIVE",
    },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: ExpenseCategoryValues) => {
    const description = values.description?.trim() ?? "";
    const statementHeading = values.statementHeading?.trim() ?? "";
    try {
      await createCategory({
        name: values.name,
        ...(description ? { description } : {}),
        ...(statementHeading ? { statementHeading } : {}),
        statementSection: values.statementSection,
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
          className="flex flex-col gap-5"
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
          <CategoryStatementFields
            control={control}
            errors={errors}
            register={register}
          />
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={close}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} loading={isLoading} size="lg">
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
  const { has } = usePermissions();
  const canManage = isSuperAdmin || has("VOCABULARY_MANAGE");

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
  const registerFiltered = Boolean(search) || activeFilterCount > 0;
  // A register with nothing on file and no filters narrowing it shows ONLY
  // the empty state (with its create action) - a filter bar filters nothing.
  const pristine =
    !isLoading && !isError && categories.length === 0 && !registerFiltered;

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
        id: "expenses",
        accessorFn: (c) => c.expenseCount ?? 0,
        header: "Expenses filed",
        enableSorting: false,
        meta: columnMeta(),
        // The register used to be three thin columns of name/date/badge -
        // nothing said whether a heading was a workhorse or an empty bucket.
        cell: ({ row }) => (
          <Mono className="tabular-nums">
            {row.original.expenseCount ?? 0}
          </Mono>
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
      <AdminPageHeader
        title="Expense Categories"
        sub="The vocabulary every recorded expense is filed under"
      />

      {pristine || (isError && !registerFiltered) ? null : (
        <ConsoleFilterBar
          search={searchInput}
          onSearch={setSearch}
          searchPlaceholder="Search category…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={totalCount}
          noun="categories"
          action={
            canManage ? (
              <AdminButton
                aria-label="Add category"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Add category</span>
              </AdminButton>
            ) : null
          }
          inlineFilter={
            <ConsoleLabeledSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setFilter("status", v)}
              options={STATUS_FILTER_OPTIONS}
              active={statusFilter !== "all"}
            />
          }
          chips={
            <>
              {statusFilter !== "all" ? (
                <FilterChip onRemove={() => setFilter("status", "all")}>
                  Status: {labelOf(STATUS_FILTER_OPTIONS, statusFilter)}
                </FilterChip>
              ) : null}
            </>
          }
        />
      )}

      {isLoading ? (
        <ConsoleTableSkeleton columns={4} />
      ) : isError ? (
        <ErrorMessage
          description={extractApiError(error).message}
          onRetry={() => void refetch()}
        />
      ) : categories.length === 0 ? (
        <RegisterEmpty
          filtered={registerFiltered}
          noun="categories"
          title="No expense categories yet"
          description="Add the first category expenses will be filed under - transport, loading, commission."
          actionLabel={canManage ? "Add your first category" : undefined}
          onAction={canManage ? () => setCreateOpen(true) : undefined}
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
    control,
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
      statementHeading: category?.statementHeading ?? "",
      statementSection: category?.statementSection ?? "ADMINISTRATIVE",
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
        statementHeading: category?.statementHeading ?? "",
        statementSection: category?.statementSection ?? "ADMINISTRATIVE",
      });
  }, [category, isEditing, reset]);

  const onSubmit = async (values: ExpenseCategoryValues) => {
    try {
      // Empty clears the column on an edit; on a create it is simply omitted.
      const description = values.description?.trim() ?? "";
      const statementHeading = values.statementHeading?.trim() ?? "";
      if (isEdit) {
        await updateCategory({
          id: category.id,
          body: {
            description: description || null,
            name: values.name,
            statementHeading: statementHeading || null,
            statementSection: values.statementSection,
          },
        }).unwrap();
        notify.success("Category updated");
        setIsEditing(false);
      } else {
        const res = await createCategory({
          name: values.name,
          ...(description ? { description } : {}),
          ...(statementHeading ? { statementHeading } : {}),
          statementSection: values.statementSection,
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
            {
              label: "Files under",
              value: statementSectionLabel(category.statementSection),
            },
            {
              label: "Heading on the statements",
              value: category.statementHeading ?? category.name,
            },
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
        className="flex flex-col gap-5"
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
        <CategoryStatementFields
          control={control}
          disabled={readOnly}
          errors={errors}
          readOnlyClass={roCls}
          register={register}
        />
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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Categories", href: LIST }]}
        current="Add expense category"
      />
      <DetailHeader
        title="Add expense category"
        hint="A heading costs are filed under, so spending can be grouped."
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
        <p className="text-[13.5px] leading-[1.45] text-adm-ink [overflow-wrap:anywhere]">
          {expense.description ?? <Absent />}
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-adm-muted">
          {/* The voucher number is the line's handle: the description can be
              empty, the number never is, so it carries the link to the cost's
              own page. */}
          <Link
            className={cn(adminLinkClass, "font-adminmono text-[12px] tabular-nums")}
            href={`/admin/expenses/${expense.id}`}
          >
            {expense.transactionNo}
          </Link>
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
/**
 * Filters for the vouchers under a category. Module-const so the identity is
 * stable across renders (useTableQuery compares against it to decide which
 * params are non-default and therefore worth putting in the URL).
 */
const CATEGORY_EXPENSE_FILTERS = { from: "", to: "" };
const CATEGORY_EXPENSE_PAGE_SIZE = 12;

function CategoryExpensesCard({ categoryId }: { categoryId: string }) {
  const showMoney = useMoneyVisibility();
  // Server-synced, not local state. A category accumulates vouchers for as
  // long as the business runs, so this list can never be "just fetch them" -
  // the page, the search and the date window all belong to the request, and
  // the URL carries them so a filtered view can be shared, reloaded and
  // stepped back through.
  const {
    filters,
    page,
    queryParams,
    resetFilters,
    search,
    setFilter,
    setPage,
    setSearch,
  } = useTableQuery({
    defaults: CATEGORY_EXPENSE_FILTERS,
    pageSize: CATEGORY_EXPENSE_PAGE_SIZE,
    prefix: "exp",
  });

  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetExpensesQuery({ ...queryParams, categoryId });

  const rows = data?.data ?? [];
  const windowTotal = data?.summary?.totalGhs;
  const totalPages = Math.max(
    1,
    Math.ceil((data?.meta.total ?? 0) / CATEGORY_EXPENSE_PAGE_SIZE),
  );
  const matched = data?.meta.total ?? 0;
  const activeFilterCount = (filters.from ? 1 : 0) + (filters.to ? 1 : 0);
  const filtered = activeFilterCount > 0 || search.trim().length > 0;
  // Nothing filed under the category and nothing narrowing it: the empty
  // state alone - a search box over an empty ledger searches nothing.
  const pristine = !isLoading && !isError && rows.length === 0 && !filtered;

  return (
    // Fills the column so the statement ends where the record rail beside it
    // does. A category with one expense left a short card at the top of the
    // left column with the rail running past it - the same imbalance the tile
    // grid had, in a different shape.
    <div className="flex h-full flex-col">
      {/* The same heading component every other section uses - this card had
          hand-rolled its own copy of it. */}
      <SectionHeading
        className="mb-2"
        actions={
          showMoney && windowTotal !== null && windowTotal !== undefined ? (
            <span className="flex items-baseline gap-2">
              {/* The server sums the WHOLE filtered set, not the page on
                  screen, so narrowing the window answers "what did we spend
                  on this in July?" rather than "what is on page 1?". */}
              <span className="text-[11px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                {filtered ? "Matched" : "Total"}
              </span>
              <Mono className="text-[16px] font-bold text-adm-ink">
                {formatCedis(windowTotal)}
              </Mono>
            </span>
          ) : null
        }
      >
        Expenses in this category
      </SectionHeading>

      {/* Searching and the date window are the server's job here. Filtering
          12 rows in the browser would answer only for the page in hand, and
          silently miss every voucher on the pages behind it. */}
      {pristine ? null : (
        <ConsoleFilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search voucher no. or description…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          totalCount={matched}
          noun="expenses"
          chips={
            <>
              {filters.from ? (
                <FilterChip onRemove={() => setFilter("from", "")}>
                  Incurred from: {filters.from}
                </FilterChip>
              ) : null}
              {filters.to ? (
                <FilterChip onRemove={() => setFilter("to", "")}>
                  Incurred to: {filters.to}
                </FilterChip>
              ) : null}
            </>
          }
        >
          <ConsoleDateRange
            from={filters.from}
            to={filters.to}
            onFromChange={(v) => setFilter("from", v)}
            onToChange={(v) => setFilter("to", v)}
            fromLabel="Incurred from"
            toLabel="Incurred to"
          />
        </ConsoleFilterBar>
      )}

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
        <RegisterEmpty
          filtered={filtered}
          noun="expenses"
          description="Nothing has been filed under this category so far."
          filteredTitle="No expenses match"
          filteredDescription="Nothing under this category matches that search or date window."
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Categories", href: LIST }]}
        current="Expense category details"
      />
      <DetailHeader
        title="Expense category details"
        hint="One heading, and every cost filed under it."
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
