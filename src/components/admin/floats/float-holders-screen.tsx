"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import {
  Money,
  useIdempotencyKey,
} from "@/components/admin/disbursements/disbursement-bits";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminField,
  AdminPageHeader,
  ToneBadge,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { useConfirm } from "@/hooks/use-confirm";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetFloatHoldersQuery,
  useSetFloatHolderStatusMutation,
  useTopUpHolderFloatMutation,
} from "@/redux/floats/floats-api";
import type { IFloatHolder, IFloatHolderListQuery } from "@/types/agent.types";
import { UserRole } from "@/types/user.types";
import {
  floatTopUpSchema,
  type FloatTopUpValues,
} from "@/validations/disbursement-schema";

const FILTER_DEFAULTS = { funded: "all", role: "all", size: "10" };

const ROLE_FILTER_OPTIONS = [
  { label: "Staff and agents", value: "all" },
  { label: "Field agents", value: UserRole.AGENT },
  { label: "Office staff", value: UserRole.STAFF },
];

const FUNDED_FILTER_OPTIONS = [
  { label: "Everyone", value: "all" },
  { label: "Only those funded", value: "yes" },
];

/**
 * Who is holding company money to spend.
 *
 * Staff and field agents in one list on purpose: the owner's question is "who
 * has my money", and that does not care which of the two somebody is. The
 * agent-only work - purchases, sit-down cash counts - stays on the agents
 * screen; this is the money side alone.
 */
export function FloatHoldersScreen() {
  const showMoney = useMoneyVisibility();
  const { filters, page, queryParams, resetFilters, search, setFilter, setPage, setSearch } =
    useTableQuery({ defaults: FILTER_DEFAULTS });
  const [toppingUp, setToppingUp] = useState<IFloatHolder | null>(null);

  const limit = Number(filters.size);
  const args: IFloatHolderListQuery = {
    limit,
    page,
    ...(queryParams.search ? { search: String(queryParams.search) } : {}),
    ...(filters.role !== "all" ? { role: filters.role as UserRole } : {}),
    ...(filters.funded === "yes" ? { withAccountOnly: true } : {}),
  };
  const { data, error, isFetching, isLoading, refetch } =
    useGetFloatHoldersQuery(args);

  const rows = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const activeFilterCount = (["funded", "role"] as const).filter(
    (k) => filters[k] !== "all",
  ).length;

  // Columns follow the register convention: an explicit `id` plus an
  // `accessorFn`, not the `accessorKey` shorthand. The mobile card renderer
  // decides what is a DATA row (label + value) versus a trailing ACTION by
  // testing `columnDef.accessorFn`, and the shorthand leaves that undefined -
  // which silently tipped every column into the actions row and produced a
  // card with no labels and no truncation.
  const columns = useMemo<ColumnDef<IFloatHolder, unknown>[]>(() => {
    const base: ColumnDef<IFloatHolder, unknown>[] = [
      {
        id: "person",
        accessorFn: (h) => `${h.firstName} ${h.lastName}`,
        header: "Person",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <span className="block min-w-0 text-left">
            <span className="block truncate font-medium text-ink">
              {row.original.firstName} {row.original.lastName}
            </span>
            <span className="block truncate text-[11.5px] text-soil/70">
              {row.original.email}
            </span>
          </span>
        ),
      },
      {
        id: "role",
        accessorFn: (h) =>
          h.role === UserRole.AGENT ? "Field agent" : "Office staff",
        header: "Role",
        enableSorting: false,
        meta: columnMeta(),
      },
      {
        id: "float",
        accessorFn: (h) =>
          !h.accountId ? "Not funded yet" : h.accountActive ? "Active" : "Suspended",
        header: "Float",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <HolderState holder={row.original} />,
      },
    ];

    // The money column is dropped ENTIRELY rather than filled with "Hidden"
    // placeholders when the caller may not see figures (design doc 8.3).
    if (showMoney) {
      base.push({
        id: "balance",
        accessorFn: (h) => h.balanceGhs ?? 0,
        header: "Balance",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <Money
            className={cn(
              row.original.balanceGhs !== null && row.original.balanceGhs < 0
                ? "text-console-red"
                : undefined,
            )}
            value={row.original.balanceGhs}
          />
        ),
      });
    }

    base.push({
      id: "actions",
      header: "",
      enableSorting: false,
      meta: columnMeta({ className: "text-right" }),
      cell: ({ row }) => (
        <HolderActions holder={row.original} onTopUp={setToppingUp} />
      ),
    });
    return base;
  }, [showMoney]);

  if (isLoading) return <ConsoleTableSkeleton />;
  if (error) {
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Floats"
        sub="Who is holding company money to spend, and how much is left"
      />

      <ConsoleFilterBar
        activeCount={activeFilterCount}
        onClear={resetFilters}
        onSearch={setSearch}
        search={search}
        searchPlaceholder="Name, email or phone…"
      >
        <ConsoleLabeledSelect
          active={filters.role !== "all"}
          label="Role"
          onChange={(v) => setFilter("role", v)}
          options={ROLE_FILTER_OPTIONS}
          value={filters.role}
        />
        <ConsoleLabeledSelect
          active={filters.funded !== "all"}
          label="Funded"
          onChange={(v) => setFilter("funded", v)}
          options={FUNDED_FILTER_OPTIONS}
          value={filters.funded}
        />
      </ConsoleFilterBar>

      <ConsoleDataTable<IFloatHolder>
        columns={columns}
        data={rows}
        emptyState={
          <EmptyState
            title="Nobody matches"
            description="Try a different role or search term."
          />
        }
        isFetching={isFetching}
        itemNoun="people"
        rowClassName={() => "h-14 hover:bg-surface-alt/60"}
        serverPagination={{
          onPageChange: setPage,
          onPageSizeChange: (size) => setFilter("size", String(size)),
          page,
          pageSize: limit,
          totalCount: total,
        }}
      />

      <TopUpDialog holder={toppingUp} onClose={() => setToppingUp(null)} />
    </div>
  );
}

/**
 * Three states worth telling apart: never funded, funded and spendable, and
 * funded but suspended. Collapsing the first and third into "no float" would
 * hide the fact that somebody's money is frozen rather than absent.
 */
function HolderState({ holder }: { holder: IFloatHolder }) {
  if (!holder.accountId) {
    return <span className="text-soil/60">Not funded yet</span>;
  }
  if (!holder.accountActive) {
    return <ToneBadge tone="alert">Suspended</ToneBadge>;
  }
  return <ToneBadge tone="leaf">Active</ToneBadge>;
}

function HolderActions({
  holder,
  onTopUp,
}: {
  holder: IFloatHolder;
  onTopUp: (holder: IFloatHolder) => void;
}) {
  const [setStatus, { isLoading }] = useSetFloatHolderStatusMutation();
  const { confirm, confirmationDialog } = useConfirm();

  const toggle = async () => {
    const suspending = holder.accountActive;
    const ok = await confirm({
      confirmText: suspending ? "Suspend the float" : "Restore the float",
      description: suspending
        ? `${holder.firstName} will not be able to send money or spend from their float. Their history is untouched, and you can restore it at any time.`
        : `${holder.firstName} will be able to spend from their float again.`,
      isDestructive: suspending,
      title: suspending ? "Suspend this float?" : "Restore this float?",
    });
    if (!ok) return;
    try {
      const res = await setStatus({
        isActive: !holder.accountActive,
        userId: holder.userId,
      }).unwrap();
      notify.success(res.message);
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <div className="flex justify-end gap-2">
      <AdminButton onClick={() => onTopUp(holder)} type="button" variant="ghost">
        Top up
      </AdminButton>
      {holder.accountId ? (
        <AdminButton
          disabled={isLoading}
          onClick={() => void toggle()}
          type="button"
          variant="ghost"
        >
          {holder.accountActive ? "Suspend" : "Restore"}
        </AdminButton>
      ) : null}
      {confirmationDialog}
    </div>
  );
}

function TopUpDialog({
  holder,
  onClose,
}: {
  holder: IFloatHolder | null;
  onClose: () => void;
}) {
  const [topUp, { isLoading }] = useTopUpHolderFloatMutation();
  const form = useForm<FloatTopUpValues>({
    defaultValues: { amountGhs: "", method: "CASH", reason: "" },
    resolver: zodResolver(floatTopUpSchema),
  });

  // A top-up is real cash handed over; the key makes a re-submitted one
  // credit the person once rather than twice.
  const idempotencyKey = useIdempotencyKey(holder !== null);
  useEffect(() => {
    if (holder) form.reset({ amountGhs: "", method: "CASH", reason: "" });
  }, [form, holder]);

  const onSubmit = async (values: FloatTopUpValues) => {
    if (!holder) return;
    try {
      const res = await topUp({
        amountGhs: Number(values.amountGhs),
        idempotencyKey: idempotencyKey(),
        method: values.method,
        reason: values.reason || undefined,
        userId: holder.userId,
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog open={holder !== null} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            Top up {holder ? `${holder.firstName} ${holder.lastName}` : ""}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Records money you have handed over. This is their spending limit -
            the cash itself still comes out of the company account when they
            send.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-4 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField
            label="Amount (GH₵)"
            error={form.formState.errors.amountGhs?.message}
          >
            <Input
              className={cn(adminInputClass, "font-adminmono")}
              inputMode="decimal"
              placeholder="0.00"
              {...form.register("amountGhs")}
            />
          </AdminField>
          <AdminField label="How did it reach them?">
            <select className={adminSelectClass} {...form.register("method")}>
              <option value="CASH">Cash</option>
              <option value="MOMO">Mobile money</option>
              <option value="BANK">Bank transfer</option>
            </select>
          </AdminField>
          <AdminField label="Note" optional>
            <Input
              className={adminInputClass}
              placeholder="e.g. Ahead of the Tolon buying round"
              {...form.register("reason")}
            />
          </AdminField>
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {isLoading ? "Recording…" : "Record top-up"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
