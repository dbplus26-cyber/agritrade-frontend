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
  FilterChip,
  labelOf,
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
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetFloatHoldersQuery,
  useSetFloatHolderStatusMutation,
  useSetHolderAuthorityMutation,
  useTopUpHolderFloatMutation,
} from "@/redux/floats/floats-api";
import type { IFloatHolder, IFloatHolderListQuery } from "@/types/agent.types";
import type { ISettlementAccount } from "@/types/payment-account.types";
import { UserRole } from "@/types/user.types";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import { useGetSettlementAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import {
  giveMoneySchema,
  type GiveMoneyValues,
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
  const [giving, setGiving] = useState<IFloatHolder | null>(null);

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
            onGive={setGiving}
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
    <div>
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
        totalCount={total}
        noun="float holders"
        chips={
          <>
            {filters.role !== "all" ? (
              <FilterChip onRemove={() => setFilter("role", "all")}>
                Role: {labelOf(ROLE_FILTER_OPTIONS, filters.role)}
              </FilterChip>
            ) : null}
            {filters.funded !== "all" ? (
              <FilterChip onRemove={() => setFilter("funded", "all")}>
                Funded: {labelOf(FUNDED_FILTER_OPTIONS, filters.funded)}
              </FilterChip>
            ) : null}
          </>
        }
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

      <GiveMoneyDialog holder={giving} onClose={() => setGiving(null)} />
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
  onGive,
}: {
  holder: IFloatHolder;
  onGive: (holder: IFloatHolder) => void;
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
      {/* One door. Handing over notes, transferring e-cash and widening what
          somebody may spend of the company's money are three different acts
          with three different entries in the books - but a reader should not
          have to know which one they want before they can find it. */}
      <AdminButton onClick={() => onGive(holder)} type="button" variant="ghost">
        Give money
      </AdminButton>
      {holder.accountId ? (
        <AdminButton
          disabled={isLoading}
          loading={isLoading}
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
 * One dialog for every way money reaches a holder.
 *
 * There used to be two, and the split was along the wrong seam. "Top up" and
 * "Send limit" are not two features, they are three DIFFERENT ACTS that the
 * console asked about in two places:
 *
 *   1. notes handed across a desk,
 *   2. e-cash transferred to their MoMo or bank,
 *   3. permission to spend the company's money without holding any of it.
 *
 * Anyone reading two buttons had to already know which of the three they
 * wanted before they could find it. Worse, the old Send limit dialog asked
 * which account the sending drew on, which invited the one answer that cannot
 * work: a send is a Hubtel API call against the Hubtel disbursement wallet, so
 * an allowance pointed at the company MoMo booked the debit somewhere the money
 * had never left. There is no picker here, because there is no choice.
 *
 * So: ask what KIND of giving this is first, and let that decide the fields.
 * The three branches map onto what the server already models - a transfer into
 * a held account for the first two, a spending authority for the third.
 */
const GIVE_MODES: {
  blurb: string;
  label: string;
  value: GiveMoneyValues["mode"];
}[] = [
  {
    blurb:
      "Notes out of the office cash till, into their name. Counted against them until it comes back or is spent.",
    label: "Physical cash",
    value: "CASH",
  },
  {
    blurb:
      "A transfer from a company account to their mobile money or bank. Say which account it leaves.",
    label: "Send them e-cash",
    value: "ECASH",
  },
  {
    blurb:
      "No money changes hands. They may send up to this much of the company's money from their console.",
    label: "Let them spend company money",
    value: "SPEND",
  },
];

const E_CASH_TENDERS: { label: string; value: "BANK" | "MOMO" }[] = [
  { label: "Their mobile money", value: "MOMO" },
  { label: "Their bank account", value: "BANK" },
];

function GiveMoneyDialog({
  holder,
  onClose,
}: {
  holder: null | IFloatHolder;
  onClose: () => void;
}) {
  const [topUp, { isLoading: funding }] = useTopUpHolderFloatMutation();
  const [setAuthority, { isLoading: authorising }] =
    useSetHolderAuthorityMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const { data: settlement } = useGetSettlementAccountsQuery();

  const form = useForm<GiveMoneyValues>({
    defaultValues: {
      amountGhs: "",
      capGhs: "",
      fromAccountId: "",
      mode: "CASH",
      reason: "",
      toKind: "MOMO",
    },
    resolver: zodResolver(giveMoneySchema),
  });
  const mode = form.watch("mode");

  // Money handed over is real; the key makes a re-submitted form credit the
  // person once rather than twice. Permission is idempotent by nature.
  const idempotencyKey = useIdempotencyKey(holder !== null);

  useEffect(() => {
    if (!holder) return;
    form.reset({
      amountGhs: "",
      capGhs:
        holder.authority?.capGhs === null ||
        holder.authority?.capGhs === undefined
          ? ""
          : String(holder.authority.capGhs),
      fromAccountId: "",
      mode: "CASH",
      reason: "",
      toKind: "MOMO",
    });
  }, [form, holder]);

  /**
   * The office cash box, resolved BY NAME rather than picked off a list. The
   * server keeps it under a stable handle precisely so a screen never has to
   * guess which of several cash-looking accounts is the real till.
   */
  const till = settlement?.data.accounts.find(
    (a: ISettlementAccount) => a.systemKey === "COMPANY_TILL",
  );

  const onSubmit = async (values: GiveMoneyValues) => {
    if (!holder) return;
    const who = `${holder.firstName} ${holder.lastName}`;

    if (values.mode === "SPEND") {
      try {
        const res = await setAuthority({
          // Blank CLEARS the cap. Sending zero would suspend them instead,
          // which is a different decision with its own switch.
          capGhs: values.capGhs === "" ? null : Number(values.capGhs),
          userId: holder.userId,
        }).unwrap();
        notify.success(res.message);
        onClose();
      } catch (err) {
        notify.error(extractApiError(err).message);
      }
      return;
    }

    const cash = values.mode === "CASH";
    if (cash && !till) {
      notify.error("No company cash till is set up yet", {
        description:
          "Handing over notes has to come out of the till. Open it under Payment accounts first.",
      });
      return;
    }

    // The one mistake here - right amount, wrong holder, picked off a list of
    // similar names on a phone - is silent until somebody reconciles, so the
    // holder's own name has to be typed before it commits.
    const confirmed = await confirm({
      title: cash ? "Hand over this cash?" : "Send this money?",
      description: `${formatCedis(Number(values.amountGhs))} to ${who}, as ${
        cash
          ? "physical cash out of the company till"
          : (E_CASH_TENDERS.find((t) => t.value === values.toKind)?.label.toLowerCase() ??
            "a transfer")
      }. It leaves a company account and is counted against them at once; only a reconciliation can correct it.`,
      confirmText: cash ? "Record hand-over" : "Record transfer",
      requireExactMatch: holder.firstName,
    });
    if (!confirmed) return;

    try {
      const res = await topUp({
        amountGhs: Number(values.amountGhs),
        fromAccountId: cash ? (till?.id ?? "") : values.fromAccountId,
        idempotencyKey: idempotencyKey(),
        reason: values.reason?.trim() || undefined,
        toKind: cash ? "CASH" : values.toKind,
        userId: holder.userId,
      }).unwrap();
      notify.success(res.message);
      onClose();
    } catch (err) {
      notify.error(extractApiError(err).message);
    }
  };

  const busy = funding || authorising;
  const submitLabel = busy
    ? "Saving…"
    : mode === "SPEND"
      ? "Save limit"
      : mode === "CASH"
        ? "Record hand-over"
        : "Record transfer";

  return (
    <ResponsiveDialog
      open={holder !== null}
      onOpenChange={(o) => !o && onClose()}
    >
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="[overflow-wrap:anywhere]">
            Give {holder ? holder.firstName : "them"} money
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Three different things, and the books record them differently. Say
            which this is.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="space-y-5 px-4 pb-2 sm:px-0"
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        >
          <AdminField label="What are you giving them?">
            <Controller
              control={form.control}
              name="mode"
              render={({ field }) => (
                <div className="space-y-2">
                  {GIVE_MODES.map((option) => (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer gap-2.5 border p-3 transition-colors",
                        field.value === option.value
                          ? "border-console bg-adm-sunken"
                          : "border-adm-line hover:bg-adm-sunken",
                      )}
                    >
                      <input
                        checked={field.value === option.value}
                        className="mt-1 accent-[var(--console)]"
                        name="give-mode"
                        onChange={() => field.onChange(option.value)}
                        type="radio"
                        value={option.value}
                      />
                      <span className="min-w-0">
                        <span className="block text-[13px] text-adm-ink">
                          {option.label}
                        </span>
                        <span className="block text-[12px] text-adm-muted">
                          {option.blurb}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
          </AdminField>

          {mode === "SPEND" ? (
            <AdminField
              error={form.formState.errors.capGhs?.message}
              hint="Leave blank for no limit. Measured against what they have already sent, not against a balance that falls. Sends always come out of the Hubtel payout wallet - it is the only account the system can move money from."
              label="Most they may send (GH₵)"
            >
              <Input
                className={cn(adminInputClass, "font-adminmono")}
                inputMode="decimal"
                placeholder="Blank for no limit"
                {...form.register("capGhs")}
              />
            </AdminField>
          ) : (
            <>
              <AdminField
                error={form.formState.errors.amountGhs?.message}
                label="Amount (GH₵)"
              >
                <Input
                  className={cn(adminInputClass, "font-adminmono")}
                  inputMode="decimal"
                  placeholder="e.g. 2000.00"
                  {...form.register("amountGhs")}
                />
              </AdminField>

              {mode === "CASH" ? (
                // Named, not chosen. Notes handed over always leave the office
                // box, and the account in their name is opened on demand - so
                // there is nothing here for the owner to get wrong.
                <p className="border border-adm-line bg-adm-sunken p-3 text-[12px] text-adm-muted">
                  Out of{" "}
                  <span className="text-adm-ink">
                    {till ? till.label : "the company cash till"}
                  </span>
                  , into a cash account in {holder ? holder.firstName : "their"}
                  &rsquo;s name. Opened automatically the first time.
                </p>
              ) : (
                <>
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
                  <AdminField label="Sent to their">
                    <Controller
                      control={form.control}
                      name="toKind"
                      render={({ field }) => (
                        <SimpleSelect
                          className={adminSelectClass}
                          onChange={field.onChange}
                          options={E_CASH_TENDERS}
                          placeholder="Choose the wallet or bank"
                          value={field.value}
                        />
                      )}
                    />
                  </AdminField>
                </>
              )}

              <AdminField label="Note" optional>
                <Input
                  className={adminInputClass}
                  placeholder="e.g. Ahead of the Tolon buying round"
                  {...form.register("reason")}
                />
              </AdminField>
            </>
          )}
        </form>

        <ResponsiveDialogFooter>
          <AdminButton onClick={onClose} type="button" variant="ghost">
            Cancel
          </AdminButton>
          <AdminButton
            disabled={busy}
            loading={busy}
            onClick={() => void form.handleSubmit(onSubmit)()}
            type="button"
          >
            {submitLabel}
          </AdminButton>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}
