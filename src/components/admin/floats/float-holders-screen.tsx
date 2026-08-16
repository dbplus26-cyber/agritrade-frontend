"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { columnHelp, ConsoleDataTable } from "@/components/admin/data-table";
import {
  Money,
  useIdempotencyKey,
} from "@/components/admin/disbursements/disbursement-bits";
import {
  ConsoleFilterBar,
  ConsoleLabeledSelect,
} from "@/components/admin/filter-bar";
import { columnMeta } from "@/components/admin/registry/registry-bits";
import { TitleCell } from "@/components/admin/table-cells";
import { ConsoleTableSkeleton } from "@/components/admin/skeletons";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  ToneBadge,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { RegisterEmpty } from "@/components/admin/register-empty";
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
import { SimpleSelect } from "@/components/ui/simple-select";
import { useConfirm } from "@/hooks/use-confirm";
import { usePermissions } from "@/hooks/use-permissions";
import { useMoneyVisibility } from "@/hooks/use-money-visibility";
import { useTableQuery } from "@/hooks/use-table-query";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetFloatHoldersQuery,
  useSetFloatHolderStatusMutation,
  useSetHolderAuthorityMutation,
  useTopUpHolderFloatMutation,
} from "@/redux/floats/floats-api";
import type { IFloatHolder, IFloatHolderListQuery } from "@/types/agent.types";
import { UserRole } from "@/types/user.types";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import {
  sendLimitSchema,
  type SendLimitValues,
  topUpSchema,
  type TopUpValues,
} from "@/validations/float-schema";

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
  const [settingLimit, setSettingLimit] = useState<IFloatHolder | null>(null);

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
  const filtered = activeFilterCount > 0 || Boolean(queryParams.search);
  // Loading and error return early below, so at render time an empty rows
  // list with no filters means a genuinely pristine register: show the empty
  // state alone - a filter bar filters nothing.
  const pristine = rows.length === 0 && !filtered;
  const { has } = usePermissions();
  const canManage = has("FLOATS_MANAGE");

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
        meta: columnMeta({ stretch: true }),
        cell: ({ row }) => (
          <TitleCell
            // A field agent goes to the agent profile, which holds their float
            // ledger and their reconciliations; office staff have no such page,
            // so they go to their user record instead. Every holder is somebody
            // the console can show you - the two just live in different
            // registers.
            href={
              row.original.role === UserRole.AGENT
                ? `/admin/agents/${row.original.userId}`
                : `/admin/users/${row.original.userId}`
            }
            meta={row.original.email}
            title={`${row.original.firstName} ${row.original.lastName}`}
          />
        ),
      },
      {
        id: "role",
        accessorFn: (h) =>
          h.role === UserRole.AGENT ? "Field agent" : "Office staff",
        header: "Role",
        enableSorting: false,
        meta: columnMeta({ at: "lg" }),
      },
      {
        id: "float",
        accessorFn: (h) =>
          !h.accountId ? "Not funded yet" : h.accountActive ? "Active" : "Suspended",
        header: columnHelp(
          "Float",
          "Whether this person has been given company money to spend, and whether they can still spend it.",
        ),
        enableSorting: false,
        meta: columnMeta({ at: "md" }),
        cell: ({ row }) => <HolderState holder={row.original} />,
      },
    ];

    // The money column is dropped ENTIRELY rather than filled with "Hidden"
    // placeholders when the caller may not see figures (design doc 8.3).
    if (showMoney) {
      base.push({
        id: "balance",
        accessorFn: (h) => h.balanceGhs ?? 0,
        header: columnHelp(
          "Balance",
          "What is left of the money handed to this person, after everything they have spent or sent.",
        ),
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

      // Beside the balance and never added to it. These are the two numbers
      // the float made into one, and a column that summed or blurred them
      // would put the original bug back on the owner's first screen.
      base.push({
        id: "allowance",
        accessorFn: (h) => h.authority?.remainingGhs ?? 0,
        header: columnHelp(
          "May send",
          "How much of the COMPANY's money this person may still send. Nothing to do with what they are holding: a send takes money out of a company account, not out of their pocket.",
        ),
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => <HolderAllowance holder={row.original} />,
      });
    }

    // Top-up / suspend belong to FLOATS_MANAGE holders; for everyone else
    // the register is read-only and the actions column does not exist.
    if (canManage) {
      base.push({
        id: "actions",
        header: "",
        enableSorting: false,
        meta: columnMeta(),
        cell: ({ row }) => (
          <HolderActions
            holder={row.original}
            onSetLimit={setSettingLimit}
            onTopUp={setToppingUp}
          />
        ),
      });
    }
    return base;
  }, [showMoney, canManage]);

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
        hint="Money handed to agents to buy with, and what each still holds."
        sub="Who is holding company money to spend, and how much is left"
      />

      {pristine ? null : (
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
          hint="Narrows to the people actually holding company money right now, or those holding none."
          label="Funded"
          onChange={(v) => setFilter("funded", v)}
          options={FUNDED_FILTER_OPTIONS}
          value={filters.funded}
        />
      </ConsoleFilterBar>
      )}

      {rows.length === 0 ? (
        <RegisterEmpty
          filtered={filtered}
          noun="float holders"
          description="Create AGENT or STAFF users - they appear here ready to hold company money."
          filteredDescription="Nobody matches this role, funding or search combination."
          onClear={() => {
            setSearch("");
            resetFilters();
          }}
        />
      ) : (
        // Every other register files its rows on an AdminCard. This screen and
        // the payout register rendered the table bare, so the two money
        // surfaces were the only ones with no sheet under the rows.
        <AdminCard className="overflow-hidden">
          <ConsoleDataTable<IFloatHolder>
            columns={columns}
            data={rows}
            isFetching={isFetching}
            itemNoun="people"
            rowClassName={() => "h-14 hover:bg-adm-sunken"}
            serverPagination={{
              onPageChange: setPage,
              onPageSizeChange: (size) => setFilter("size", String(size)),
              page,
              pageSize: limit,
              totalCount: total,
            }}
          />
        </AdminCard>
      )}

      <TopUpDialog holder={toppingUp} onClose={() => setToppingUp(null)} />
      <SendLimitDialog
        holder={settingLimit}
        onClose={() => setSettingLimit(null)}
      />
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
    return <span className="text-adm-faint">Not funded yet</span>;
  }
  if (!holder.accountActive) {
    return <ToneBadge tone="alert">Suspended</ToneBadge>;
  }
  return <ToneBadge tone="leaf">Active</ToneBadge>;
}

/**
 * What this person may still SEND, in its own column.
 *
 * Three different things, and telling them apart is the point. No authority at
 * all is not a limit of zero, it is somebody who has never been allowed to
 * send. An uncapped authority is not a large number, it is the absence of a
 * ceiling. And a cap has a figure left on it, which is the company's money and
 * not theirs.
 */
function HolderAllowance({ holder }: { holder: IFloatHolder }) {
  const authority = holder.authority;
  if (!authority) {
    return <span className="text-adm-faint">Not allowed to send</span>;
  }
  if (!authority.isActive) {
    return <span className="text-adm-faint">Suspended</span>;
  }
  if (authority.capGhs === null) {
    return (
      <span className="text-adm-body">
        No limit
        {authority.usedGhs ? (
          <span className="text-adm-faint">
            {" "}
            (<Money value={authority.usedGhs} /> sent)
          </span>
        ) : null}
      </span>
    );
  }
  return (
    <span className="text-adm-body">
      <Money value={authority.remainingGhs} />
      <span className="text-adm-faint">
        {" "}
        of <Money value={authority.capGhs} />
      </span>
    </span>
  );
}

function HolderActions({
  holder,
  onTopUp,
  onSetLimit,
}: {
  holder: IFloatHolder;
  onSetLimit: (holder: IFloatHolder) => void;
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
    <div className="flex flex-wrap justify-end gap-2">
      <AdminButton onClick={() => onTopUp(holder)} type="button" variant="ghost">
        Top up
      </AdminButton>
      {/* Separate from Top up, deliberately. Handing somebody money and
          widening what they may draw on the company's account are two
          decisions, and the float made them one act. */}
      <AdminButton
        onClick={() => onSetLimit(holder)}
        type="button"
        variant="ghost"
      >
        Send limit
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

/**
 * Setting what somebody may SEND, and out of which company account.
 *
 * A separate dialog from Top up, deliberately. Handing an agent cash and
 * widening what they may draw on the company's wallet are two different
 * decisions, and the float made them one act - so every top-up silently raised
 * what the agent could spend of the business's money. The two are never going
 * back into one form.
 */
function SendLimitDialog({
  holder,
  onClose,
}: {
  holder: IFloatHolder | null;
  onClose: () => void;
}) {
  const [setAuthority, { isLoading }] = useSetHolderAuthorityMutation();
  const form = useForm<SendLimitValues>({
    defaultValues: { capGhs: "", drawsOnAccountId: "" },
    resolver: zodResolver(sendLimitSchema),
  });

  useEffect(() => {
    if (!holder) return;
    form.reset({
      capGhs:
        holder.authority?.capGhs === null ||
        holder.authority?.capGhs === undefined
          ? ""
          : String(holder.authority.capGhs),
      drawsOnAccountId: holder.authority?.drawsOnAccount?.id ?? "",
    });
  }, [form, holder]);

  const onSubmit = async (values: SendLimitValues) => {
    if (!holder) return;
    try {
      const res = await setAuthority({
        // Blank CLEARS the cap. Sending zero would suspend them instead, which
        // is a different decision with its own switch.
        capGhs: values.capGhs === "" ? null : Number(values.capGhs),
        drawsOnAccountId: values.drawsOnAccountId || null,
        userId: holder.userId,
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  return (
    <ResponsiveDialog
      open={holder !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="[overflow-wrap:anywhere]">
            What {holder ? holder.firstName : "they"} may send
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            This is permission to spend the COMPANY&apos;s money, not money
            handed to them. A send takes the amount out of the account below,
            never out of what they are holding.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField
            label="Most they may send (GH₵)"
            error={form.formState.errors.capGhs?.message}
            hint="Leave blank for no limit. Measured against what they have already sent, not against a balance that falls."
          >
            <Input
              className={cn(adminInputClass, "font-adminmono")}
              inputMode="decimal"
              placeholder="Blank for no limit"
              {...form.register("capGhs")}
            />
          </AdminField>
          <Controller
            control={form.control}
            name="drawsOnAccountId"
            render={({ field }) => (
              <PaymentAccountField
                direction="out"
                error={form.formState.errors.drawsOnAccountId?.message}
                label="Sends come out of"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={isLoading}
            onClick={(e) => void form.handleSubmit(onSubmit)(e)}
            type="button"
          >
            {isLoading ? "Saving…" : "Save limit"}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
  const form = useForm<TopUpValues>({
    defaultValues: {
      amountGhs: "",
      fromAccountId: "",
      reason: "",
      toKind: "CASH",
    },
    resolver: zodResolver(topUpSchema),
  });

  // A top-up is real cash handed over; the key makes a re-submitted one
  // credit the person once rather than twice.
  const idempotencyKey = useIdempotencyKey(holder !== null);
  useEffect(() => {
    if (holder) {
      form.reset({
        amountGhs: "",
        fromAccountId: "",
        reason: "",
        toKind: "CASH",
      });
    }
  }, [form, holder]);

  const onSubmit = async (values: TopUpValues) => {
    if (!holder) return;
    try {
      const res = await topUp({
        amountGhs: Number(values.amountGhs),
        fromAccountId: values.fromAccountId,
        idempotencyKey: idempotencyKey(),
        reason: values.reason?.trim() || undefined,
        toKind: values.toKind,
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
            Records money you have handed over. It leaves the company account
            you name and lands in one of theirs. This is not their sending
            limit: what they may draw on the company&apos;s account is set
            separately, under Send limit.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField
            label="Amount (GH₵)"
            error={form.formState.errors.amountGhs?.message}
          >
            <Input
              className={cn(adminInputClass, "font-adminmono")}
              inputMode="decimal"
              placeholder="e.g. 2000.00"
              {...form.register("amountGhs")}
            />
          </AdminField>
          {/* Where the money LEAVES. Required by the server, and it was not
              being sent at all - so this dialog refused every top-up made
              through it. Money in somebody's hands means a company account is
              lighter, and the books only add up if somebody says which. */}
          <Controller
            control={form.control}
            name="fromAccountId"
            render={({ field }) => (
              <PaymentAccountField
                direction="out"
                error={form.formState.errors.fromAccountId?.message}
                label="Out of which account?"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          {/* Where it LANDS. Notes in a pocket, their own wallet and their
              bank are different money, and one number for all three is what
              made an agent's position unreadable. */}
          <AdminField label="Handed over as">
            <Controller
              control={form.control}
              name="toKind"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: "CASH", label: "Cash in hand" },
                    { value: "MOMO", label: "Their mobile money" },
                    { value: "BANK", label: "Their bank account" },
                  ]}
                />
              )}
            />
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
