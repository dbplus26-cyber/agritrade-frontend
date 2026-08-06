"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  AdminButton,
  AdminCard,
  AdminPageHeader,
  Mono,
  ToneBadge,
} from "@/components/admin/ui";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  ConsoleDateRange,
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import { useTableQuery } from "@/hooks/use-table-query";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { TitleCell } from "@/components/admin/table-cells";
import { env } from "@/lib/env";
import { useGetExpensesQuery } from "@/redux/expenses/expenses-api";
import { useGetExpenseCategoriesQuery } from "@/redux/expense-categories/expense-categories-api";
import type { IExpense } from "@/types/expense.types";
import { ExpenseFormDialog } from "./expense-form";

const DEFAULTS = { categoryId: "", from: "", scope: "", to: "" };

/**
 * Operating costs. Every cost the business carries lands here — rent, salaries,
 * fumigation, repairs — alongside the per-trip costs, because the P&L subtracts
 * all of them and a screen that showed only some would make the net-profit
 * figure impossible to reconcile.
 */
export function ExpensesRegister() {
  const showMoney = useMoneyVisibility();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<IExpense | null>(null);
  const {
    filters,
    page,
    queryParams,
    resetFilters,
    search,
    setFilter,
    setPage,
    setSearch,
  } = useTableQuery({ defaults: DEFAULTS });

  const activeFilterCount =
    (filters.categoryId ? 1 : 0) +
    (filters.scope ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  const categories = useGetExpenseCategoriesQuery({ isActive: true, limit: 100 });
  const { data, error, isError, isFetching, isLoading, refetch } =
    useGetExpensesQuery({
      categoryId: String(queryParams.categoryId ?? "") || undefined,
      from: String(queryParams.from ?? "") || undefined,
      limit: 20,
      page,
      scope:
        queryParams.scope === "shipment" || queryParams.scope === "standalone"
          ? queryParams.scope
          : undefined,
      search: String(queryParams.search ?? "") || undefined,
      to: String(queryParams.to ?? "") || undefined,
    });

  const columns = useMemo<ColumnDef<IExpense, unknown>[]>(
    () => [
      {
        accessorKey: "transactionNo",
        header: "Voucher",
        cell: ({ row }) => <Mono>{row.original.transactionNo}</Mono>,
        meta: { className: "px-4 text-[13px]" },
      },
      {
        accessorFn: (r) => r.incurredAt,
        id: "incurredAt",
        header: "Date",
        cell: ({ row }) => <DateOnlyCell value={row.original.incurredAt} />,
        meta: { className: "px-4 text-[13px] whitespace-nowrap" },
      },
      {
        accessorFn: (r) => r.category.name,
        id: "category",
        header: "Category",
        // What the money was for, with the voucher's own words underneath.
        // The description had a column of its own and, being prose, was the
        // column that decided how wide this table got.
        cell: ({ row }) => (
          <TitleCell
            meta={row.original.description}
            title={row.original.category.name}
            stretch
          />
        ),
        meta: { stretch: true, className: "px-4 text-[13px]" },
      },
      {
        accessorFn: (r) => r.shipment?.transactionNo ?? "",
        id: "shipment",
        header: "Trip",
        cell: ({ row }) =>
          row.original.shipment ? (
            <ToneBadge tone="sky">{row.original.shipment.truckReg}</ToneBadge>
          ) : (
            <span className="text-adm-faint">Operating</span>
          ),
        // Hiding belongs on `className`, which the table applies to BOTH th and
        // td — `headerClassName` reaches only the header, which would hide the
        // heading while leaving its cells in place and shift every column after
        // it out of alignment.
        meta: { className: "hidden px-4 text-[13px] 2xl:table-cell" },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex gap-1.5">
            <AdminButton
              type="button"
              variant="ghost"
              className="h-7 px-2 text-[12px]"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(row.original);
              }}
            >
              Edit
            </AdminButton>
            <a
              href={`${env.SERVER_URI}/api/v1/admin/receipts/expense/${row.original.id}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => { e.stopPropagation(); }}
              className="inline-flex h-7 items-center px-2 text-[12px] text-console hover:underline"
            >
              Voucher
            </a>
          </div>
        ),
        enableSorting: false,
        meta: { className: "px-4" },
      },
      ...(showMoney
        ? [
            {
              accessorFn: (r: IExpense) => r.amountGhs ?? 0,
              id: "amountGhs",
              header: "Amount",
              cell: ({ row }: { row: { original: IExpense } }) => (
                <Mono>{formatCedis(row.original.amountGhs)}</Mono>
              ),
              meta: { className: "px-4 text-[13px]" },
            } as ColumnDef<IExpense, unknown>,
          ]
        : []),
    ],
    [showMoney],
  );

  const rows = data?.data ?? [];
  const windowTotal = data?.summary?.totalGhs;
  // A register with nothing on file and nothing narrowing it shows ONLY the
  // empty state - a filter bar and a totals strip over zero rows serve nothing.
  const pristine =
    !isLoading &&
    !isError &&
    rows.length === 0 &&
    !search &&
    activeFilterCount === 0;

  if (pristine) {
    return (
      <div>
        <AdminPageHeader
          title="Expenses"
          sub="Operating costs and per-trip spend"
        />
        <AdminCard className="overflow-hidden">
          <EmptyState
            variant="plain"
            title="No expenses yet"
            description="Record rent, salaries, fumigation and other running costs so the profit figure is honest."
            actionLabel="+ Record expense"
            onAction={() => {
              setCreating(true);
            }}
          />
        </AdminCard>
        <ExpenseFormDialog
          open={creating}
          onOpenChange={setCreating}
          categories={categories.data?.data ?? []}
        />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader title="Expenses" sub="Operating costs and per-trip spend" />

      {isError && !search && activeFilterCount === 0 ? null : (
        <ConsoleFilterBar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search description or voucher…"
          activeCount={activeFilterCount}
          onClear={resetFilters}
          action={
            <AdminButton
              className="h-8 px-3.5 text-[13px]"
              onClick={() => { setCreating(true); }}
            >
              + Record expense
            </AdminButton>
          }
        >
          <ConsoleLabeledSelect
            label="Category"
            value={filters.categoryId}
            onChange={(v) => { setFilter("categoryId", v); }}
            options={[
              { label: "All categories", value: "" },
              ...(categories.data?.data ?? []).map((c) => ({
                label: c.name,
                value: c.id,
              })),
            ]}
            active={filters.categoryId !== ""}
            className="lg:w-[180px]"
          />
          <ConsoleLabeledSelect
            label="Kind"
            value={filters.scope}
            onChange={(v) => { setFilter("scope", v); }}
            options={[
              { label: "All spend", value: "" },
              { label: "Operating costs", value: "standalone" },
              { label: "Per-trip costs", value: "shipment" },
            ]}
            active={filters.scope !== ""}
            className="lg:w-[160px]"
          />
          <ConsoleDateRange
            from={filters.from}
            to={filters.to}
            onFromChange={(v) => { setFilter("from", v); }}
            onToChange={(v) => { setFilter("to", v); }}
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
      ) : (
        <>
          {/* The number the screen exists to answer: what did we spend over this
              window? Aggregated server-side across the whole filtered set, so it
              does not change as you page. */}
          {showMoney && windowTotal !== null && windowTotal !== undefined ? (
            <div className="mb-3 flex items-baseline gap-2">
              <span className="text-[11px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                Total for this view
              </span>
              <Mono className="text-[16px] font-bold text-adm-ink">
                {formatCedis(windowTotal)}
              </Mono>
            </div>
          ) : null}

          <AdminCard className="overflow-hidden">
            <ConsoleDataTable<IExpense>
              columns={columns}
              data={rows}
              itemNoun="expenses"
              isFetching={isFetching}
              serverPagination={{
                onPageChange: setPage,
                onPageSizeChange: () => undefined,
                page,
                pageSize: 20,
                totalCount: data?.meta.total ?? 0,
              }}
              emptyState={
                // The pristine (no search, no filters) empty register returns
                // early above - reaching this means the view is narrowed.
                <EmptyState
                  variant="plain"
                  title="No matches"
                  description="Try a different search or filter."
                />
              }
            />
          </AdminCard>
        </>
      )}

      <ExpenseFormDialog
        open={creating}
        onOpenChange={setCreating}
        categories={categories.data?.data ?? []}
      />
      <ExpenseFormDialog
        open={editing !== null}
        onOpenChange={(open) => { if (!open) setEditing(null); }}
        expense={editing ?? undefined}
        categories={categories.data?.data ?? []}
      />
    </div>
  );
}
