"use client";

import { useIdempotencyKey } from "@/components/admin/disbursements/disbursement-bits";
import { useState } from "react";
import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  DetailHeader,
  adminInputClass,
  adminSelectClass,
  DetailShell,
  Mono,
  SectionHeading,
  ToneBadge,
  TONES,
  type Tone,
} from "@/components/admin/ui";
import { AgentMoneySummaryCard } from "@/components/admin/agents/agent-money-summary-card";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { HelpTip } from "@/components/admin/help-tip";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { DetailSkeleton, LedgerSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import { SimpleSelect } from "@/components/ui/simple-select";
import {
  useCreateReconciliationMutation,
  useGetAgentFloatQuery,
  useGetAgentQuery,
  useGetAgentReconciliationsQuery,
  useGetReconciliationPreviewQuery,
  useTopUpAgentMutation,
} from "@/redux/agents/agents-api";
import { extractApiError } from "@/lib/extract-api-error";
import { useAuthRole } from "@/hooks/use-auth-role";
import { useConfirm } from "@/hooks/use-confirm";
import { formatDateTime } from "@/lib/format-date";
import { formatCedis, MONEY_HIDDEN } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { ViewablePhoto } from "@/components/admin/photo-view";
import { cn } from "@/lib/utils";
import {
  type IFloatTransaction,
} from "@/types/agent.types";
import {
  reconcileSchema,
  topUpSchema,
  type ReconcileValues,
  type TopUpValues,
} from "@/validations/float-schema";
import { formatConsoleDate } from "@/components/admin/purchases/purchase-bits";

const LIST = "/admin/agents";

// The ledger is the CASH BOOK, so its lines are movement types rather than
// float types. An unknown type falls back rather than throwing: the cash book
// gains types over time and a ledger that crashes on one it has not met is
// worse than one that renders it plainly.
const TX_LABEL: Record<string, string> = {
  CAPITAL: "Own money in",
  CHARGE: "Charge",
  CORRECTION: "Correction",
  DEPOSIT: "Money in",
  PAYMENT: "Spent",
  RECEIPT: "Received",
  TRANSFER_IN: "Handed over",
  TRANSFER_OUT: "Sent back",
  WITHDRAWAL: "Money out",
};

const TX_TONE: Record<string, Tone> = {
  CAPITAL: "leaf",
  CHARGE: "harvest",
  CORRECTION: "slate",
  DEPOSIT: "leaf",
  PAYMENT: "sky",
  RECEIPT: "forest",
  TRANSFER_IN: "leaf",
  TRANSFER_OUT: "forest",
  WITHDRAWAL: "harvest",
};

/** Two-letter ledger markers, stamped in the type's tone. */
const TX_CODE: Record<string, string> = {
  CAPITAL: "CP",
  CHARGE: "CH",
  CORRECTION: "AD",
  DEPOSIT: "IN",
  PAYMENT: "SP",
  RECEIPT: "RC",
  TRANSFER_IN: "TU",
  TRANSFER_OUT: "SB",
  WITHDRAWAL: "OU",
};

const txLabel = (type: string): string => TX_LABEL[type] ?? type;
const txTone = (type: string): Tone => TX_TONE[type] ?? "slate";
const txCode = (type: string): string => TX_CODE[type] ?? "··";

/** Square type marker at the head of a ledger line (label in the tooltip). */
function TxMarker({ type }: { type: string }) {
  const t = TONES[txTone(type)];
  return (
    <span
      title={txLabel(type)}
      className="font-adminmono mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-none text-[10px] font-bold"
      style={{ background: t.bg, color: t.fg }}
    >
      {txCode(type)}
      <span className="sr-only">{txLabel(type)}</span>
    </span>
  );
}

/**
 * Where handed-over money LANDS. Not "how it was sent" - what the agent is now
 * holding, and where. Notes in a pocket, their own wallet and their bank are
 * three different pots, and a single float balance covering all three makes
 * an agent's position impossible to read.
 */
const TENDER_OPTIONS = [
  { label: "Cash in hand", value: "CASH" },
  { label: "Their mobile money", value: "MOMO" },
  { label: "Their bank account", value: "BANK" },
] as const;

/**
 * A signed float movement. The IN/OUT word is what actually carries the
 * direction: colour alone fails for a colour-blind reader and dies on a
 * printout, and a leading "-" in a column of similar figures is easy to miss.
 * A redacted amount prints the placeholder, never "null".
 */
function SignedAmount({ amount }: { amount: number | null }) {
  if (amount === null) {
    return (
      <div className="text-right">
        <Mono className="block text-[11.5px] whitespace-nowrap text-adm-faint">
          {MONEY_HIDDEN}
        </Mono>
      </div>
    );
  }
  const isDebit = amount < 0;
  return (
    <div className="text-right">
      <Mono
        className={cn(
          "block text-[11.5px] font-semibold whitespace-nowrap",
          isDebit ? "text-console-red" : "text-console",
        )}
      >
        {isDebit ? "-" : "+"}
        {formatCedis(Math.abs(amount))}
      </Mono>
      <span
        className={cn(
          "block text-[10px] font-bold tracking-[0.12em] uppercase",
          isDebit ? "text-console-red/70" : "text-console/70",
        )}
      >
        {isDebit ? "Out" : "In"}
      </span>
    </div>
  );
}

/** One line of the float summary: label left, figure hard right. */
function FigureLine({
  hint,
  label,
  children,
}: {
  /** One sentence on what the figure is, on hover beside the label. */
  hint?: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-1.5 last:border-b-0">
      <dt className="flex min-w-0 flex-none items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What is ${label}?`} text={hint} /> : null}
      </dt>
      <dd className="font-adminmono text-[11px] whitespace-nowrap text-adm-ink tabular-nums">
        {children}
      </dd>
    </div>
  );
}

/** Column headings for the ledger, so the two figure columns are named. */
/** One labelled fact on the identity band. */
function IdentityFact({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-bold tracking-[0.1em] text-adm-faint uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 min-w-0 text-[11.5px] text-adm-ink">{children}</dd>
    </div>
  );
}

function LedgerHead({ withBalance }: { withBalance: boolean }) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(124px,max-content)] items-baseline gap-x-3 border-b-[1.5px] border-adm-line pb-1.5 text-[10px] font-bold tracking-[0.12em] text-adm-faint uppercase @2xl/ledger:grid-cols-[24px_minmax(0,1fr)_minmax(124px,max-content)_minmax(124px,max-content)]">
      <span aria-hidden="true" />
      <span className="inline-flex min-w-0 items-center gap-1">
        <span className="min-w-0">Entry</span>
        <HelpTip
          label="What is an entry?"
          text="One movement of money in or out of this agent's float: a top-up, a purchase, an expense or a correction."
        />
      </span>
      <span className="text-right">Amount</span>
      {withBalance ? (
        <span className="hidden text-right @2xl/ledger:block">
          <span className="inline-flex items-center gap-1">
            <span className="min-w-0">Balance after</span>
            <HelpTip
              label="What is the balance after?"
              text="What the agent was holding once this line had been counted in."
              side="left"
            />
          </span>
        </span>
      ) : null}
    </div>
  );
}

/**
 * One ledger line: type marker, the entry, then the money columns.
 *
 * The money tracks are minmax(124px, max-content), NOT a flat 124px. A fixed
 * track does not grow, and the figures inside it are whitespace-nowrap - so a
 * float in the millions renders past the end of its own column and over the
 * one beside it. The floor keeps ordinary rows aligned on the same edge; the
 * max-content ceiling lets one large figure widen the track for every row at
 * once, which keeps the column straight instead of ragged. The grid is what
 * makes the ledger read as a ledger: a flex row lets the description push the
 * amount around, so no two rows' figures sit on the same edge and the running
 * balance hides in a "Bal …" scrap of body text.
 *
 * `balanceAfter` is undefined when the running balance is not knowable (later
 * pages, or a redacted ledger); the column is then simply absent rather than
 * showing an invented number.
 */
function LedgerRow({
  tx,
  balanceAfter,
  withBalanceColumn,
}: {
  tx: IFloatTransaction;
  balanceAfter?: number;
  /** True when any row on this page can show a balance (keeps tracks aligned). */
  withBalanceColumn: boolean;
}) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(124px,max-content)] items-start gap-x-3 border-b border-adm-hairline py-2.5 last:border-b-0 @2xl/ledger:grid-cols-[24px_minmax(0,1fr)_minmax(124px,max-content)_minmax(124px,max-content)]">
      <TxMarker type={tx.type} />
      <div className="min-w-0">
        <p className="min-w-0 text-[11.5px] leading-snug text-adm-ink [overflow-wrap:anywhere]">
          {tx.reason ?? txLabel(tx.type)}
        </p>
        <div className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="text-[10.5px] text-adm-faint">{tx.transactionNo}</Mono>
          <DateOnlyCell value={tx.occurredAt} muted />
          {/* WHICH pot moved. Cash in a pocket and money in a wallet are
              different money, and a line that does not say which is the same
              conflation the single float balance made. */}
          <span className="text-[10.5px] text-adm-faint">{tx.account.label}</span>
        </div>
        {/* Narrow cards have no room for a fourth track, so the balance rides
            under the entry rather than being dropped from the page. */}
        {balanceAfter !== undefined ? (
          <Mono className="mt-1 block text-[10.5px] text-adm-faint @2xl/ledger:hidden">
            Balance after {formatCedis(balanceAfter)}
          </Mono>
        ) : null}
      </div>
      <SignedAmount amount={tx.amountGhs} />
      {withBalanceColumn ? (
        <Mono className="hidden text-right text-[11.5px] whitespace-nowrap text-adm-ink @2xl/ledger:block">
          {balanceAfter === undefined ? (
            <span className="text-adm-faint">-</span>
          ) : (
            formatCedis(balanceAfter)
          )}
        </Mono>
      ) : null}
    </div>
  );
}

function TopUpDialog({
  agentUserId,
  agentFirstName,
  agentName,
  open,
  onClose,
}: {
  agentUserId: string;
  /** The type-to-confirm string: short enough to key in on a phone. */
  agentFirstName: string;
  agentName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [topUp, { isLoading }] = useTopUpAgentMutation();
  const { confirm, confirmationDialog } = useConfirm();
  // Money handed over is real: a re-submit after a timeout must credit the
  // agent once, not twice. Reset per open, like the floats-screen top-up.
  const idempotencyKey = useIdempotencyKey(open);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TopUpValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amountGhs: "",
      fromAccountId: "",
      reason: "",
      toKind: "CASH",
    },
  });

  const onSubmit = async (values: TopUpValues) => {
    // Cash leaving the business for someone else to hold. Typing the agent's
    // name proves the money is being handed to the intended person - the one
    // mistake here (right amount, wrong agent) is silent until reconciliation.
    const confirmed = await confirm({
      title: "Hand over this float?",
      description: `${formatCedis(Number(values.amountGhs))} to ${agentName}, as ${
        TENDER_OPTIONS.find((t) => t.value === values.toKind)?.label ??
        values.toKind
      }. It leaves the account you chose and is spendable at once; only a reconciliation can correct it.`,
      confirmText: "Top up float",
      requireExactMatch: agentFirstName,
    });
    if (!confirmed) return;

    try {
      await topUp({
        agentUserId,
        body: {
          amountGhs: Number(values.amountGhs),
          fromAccountId: values.fromAccountId,
          idempotencyKey: idempotencyKey(),
          toKind: values.toKind,
          ...(values.reason?.trim() ? { reason: values.reason.trim() } : {}),
        },
      }).unwrap();
      notify.success("Float topped up");
      onClose();
    } catch (err) {
      notify.error("Couldn't top up the float", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-[400px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="[overflow-wrap:anywhere]">
            Top up {agentName}&apos;s float
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Money handed to the agent for village purchases. It moves out of a
            company account and into theirs.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <AdminField label="Amount (GH₵)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              placeholder="e.g. 2000"
              className={cn(adminInputClass, errors.amountGhs && "border-console-red")}
              {...register("amountGhs")}
            />
          </AdminField>
          {/* Where the money LEAVES. Required: an agent holding company cash
              means a company account is lighter, and the books only add up if
              somebody says which one. */}
          <Controller
            control={control}
            name="fromAccountId"
            render={({ field }) => (
              <PaymentAccountField
                direction="out"
                error={errors.fromAccountId?.message}
                label="Out of which account?"
                onChange={field.onChange}
                value={field.value}
              />
            )}
          />
          {/* Where it LANDS. Notes in a pocket, their own wallet and their bank
              are different money - one number for all three is what made an
              agent's position unreadable. */}
          <AdminField label="Handed over as">
            <Controller
              control={control}
              name="toKind"
              render={({ field }) => (
                <SimpleSelect
                  className={cn(adminSelectClass, "w-full")}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Choose cash, MoMo or bank"
                  options={TENDER_OPTIONS}
                />
              )}
            />
          </AdminField>
          <AdminField label="Note" optional error={errors.reason?.message}>
            <Input
              placeholder="e.g. Season opening float"
              className={adminInputClass}
              {...register("reason")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" size="lg" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} loading={isLoading} size="lg">
              {isLoading ? "Topping up…" : "Top up float"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
      {confirmationDialog}
    </ResponsiveDialog>
  );
}

/** The sit-down count: preview computation, counted cash, live variance. */
function ReconcileDialog({
  agentUserId,
  agentName,
  open,
  onClose,
}: {
  agentUserId: string;
  agentName: string;
  open: boolean;
  onClose: () => void;
}) {
  const preview = useGetReconciliationPreviewQuery(agentUserId);
  const [reconcile, { isLoading }] = useCreateReconciliationMutation();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReconcileValues>({
    resolver: zodResolver(reconcileSchema),
    defaultValues: { countedGhs: "", notes: "" },
  });

  const p = preview.data?.data.preview;
  const countedRaw = watch("countedGhs");
  const counted = countedRaw.trim() === "" ? null : Number(countedRaw);
  const variance = p && counted !== null ? counted - p.expectedGhs : null;

  const onSubmit = async (values: ReconcileValues) => {
    try {
      const res = await reconcile({
        agentUserId,
        body: {
          countedGhs: Number(values.countedGhs),
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        },
      }).unwrap();
      const v = res.data.reconciliation.varianceGhs;
      notify.success(
        v === null
          ? "Reconciled"
          : v === 0
            ? "Reconciled - the count matched exactly"
            : `Reconciled with a ${formatCedis(Math.abs(v))} ${v > 0 ? "surplus" : "shortfall"} adjustment`,
      );
      onClose();
    } catch (err) {
      notify.error("Couldn't reconcile the float", {
        description: extractApiError(err).message,
      });
    }
  };

  const line = (label: string, amount: number, sign?: "+" | "-") => (
    <div className="flex items-baseline justify-between gap-4 border-b border-adm-hairline py-2 last:border-b-0">
      <span className="min-w-0 text-[11px] text-adm-body [overflow-wrap:anywhere]">
        {label}
      </span>
      <Mono className="flex-none text-[11.5px] text-adm-ink">
        {sign ?? ""}
        {formatCedis(Math.abs(amount))}
      </Mono>
    </div>
  );

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="[overflow-wrap:anywhere]">
            Reconcile {agentName}&apos;s float
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            The computation below is what the ledger says should be in hand.
            Count the cash together, enter it, and any difference posts as a
            signed adjustment - the ledger is never rewritten.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {preview.isLoading ? (
          <p className="py-2 text-[11.5px] text-adm-muted">Computing…</p>
        ) : preview.isError || !p ? (
          <ErrorMessage
            description={extractApiError(preview.error).message}
            onRetry={() => void preview.refetch()}
          />
        ) : (
          <>
            {/* The workings, as a statement rather than a grey block. Rows
                2px apart with the label and its figure at almost the same
                weight read as one texture, burying the total - the only line
                anyone needs - inside it. */}
            <div className="rounded-none border border-adm-line bg-adm-sunken px-4 py-1">
              {line(
                p.since
                  ? `Opening (last count ${formatConsoleDate(p.since)})`
                  : "Opening (first count)",
                p.openingGhs,
              )}
              {line("Top-ups since", p.topUpsGhs, "+")}
              {line("Purchases since", p.purchasesGhs, "-")}
              {line("Field expenses since", p.expensesGhs, "-")}
              {p.adjustmentsGhs !== 0
                ? line(
                    "Adjustments since",
                    p.adjustmentsGhs,
                    p.adjustmentsGhs >= 0 ? "+" : "-",
                  )
                : null}
              <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t-[1.5px] border-adm-strong py-3">
                <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                  Expected in hand
                </span>
                <Mono className="text-[18px] font-semibold text-adm-ink">
                  {formatCedis(p.expectedGhs)}
                </Mono>
              </div>
            </div>

            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="mt-4 flex flex-col gap-3.5"
            >
              <AdminField
                label="Counted cash (GH₵)"
                error={errors.countedGhs?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder="What is actually in hand"
                  className={cn(
                    adminInputClass,
                    errors.countedGhs && "border-console-red",
                  )}
                  {...register("countedGhs")}
                />
              </AdminField>
              {variance !== null && !Number.isNaN(variance) ? (
                <p
                  className={cn(
                    "text-[11px] font-medium",
                    variance === 0
                      ? "text-console"
                      : variance > 0
                        ? "text-adm-muted"
                        : "text-console-red",
                  )}
                >
                  {variance === 0
                    ? "Counts exactly - no adjustment needed."
                    : variance > 0
                      ? `${formatCedis(variance)} surplus will be posted.`
                      : `${formatCedis(Math.abs(variance))} shortfall will be posted.`}
                </p>
              ) : null}
              <AdminField label="Notes" optional error={errors.notes?.message}>
                <Input
                  placeholder="e.g. Porter receipts missing for two villages"
                  className={adminInputClass}
                  {...register("notes")}
                />
              </AdminField>
              <ResponsiveDialogFooter className="gap-2">
                <AdminButton
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={onClose}
                >
                  Cancel
                </AdminButton>
                <AdminButton
                  type="submit"
                  disabled={isLoading}
                  loading={isLoading}
                  size="lg"
                >
                  {isLoading ? "Posting…" : "Post reconciliation"}
                </AdminButton>
              </ResponsiveDialogFooter>
            </form>
          </>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/** Counts per page in the reconciliations rail. */
const RECON_PAGE_SIZE = 5;

export function AgentDetail({ agentUserId }: { agentUserId: string }) {
  const detail = useGetAgentQuery(agentUserId);
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledger = useGetAgentFloatQuery({
    agentUserId,
    params: { page: ledgerPage, limit: 10 },
  });
  // Counts accumulate for as long as the agent holds a float, so the rail
  // pages against the server rather than showing an unlabelled "first five"
  // that quietly stops being the whole story.
  const [reconPage, setReconPage] = useState(1);
  const recons = useGetAgentReconciliationsQuery({
    agentUserId,
    limit: RECON_PAGE_SIZE,
    page: reconPage,
  });
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const { isSuperAdmin } = useAuthRole();

  if (detail.isLoading) return <DetailSkeleton main="ledger" />;
  if (detail.isError || !detail.data)
    return (
      <ErrorMessage
        description={extractApiError(detail.error).message}
        onRetry={() => void detail.refetch()}
      />
    );

  const agent = detail.data.data.agent;
  const name = `${agent.firstName} ${agent.lastName}`;
  const balance = ledger.data?.summary.balanceGhs ?? agent.balanceGhs;
  const transactions = ledger.data?.data ?? [];
  const totalTx = ledger.data?.meta.total ?? 0;

  // "Balance after" per ledger line, walked down from the live balance: the
  // ledger arrives newest-first, so the top row sits at the live balance and
  // each row below sits at the row above's balance minus that row's amount.
  // Only exact on page 1 (later pages don't start at the live balance) and
  // only when money is visible - redacted ledgers skip the column entirely.
  const withBalanceAfter =
    ledgerPage === 1 &&
    balance !== null &&
    transactions.every((t) => t.amountGhs !== null);
  const ledgerRows: { balanceAfter?: number; tx: IFloatTransaction }[] = [];
  let nextAfter = balance ?? 0;
  for (const tx of transactions) {
    ledgerRows.push({
      balanceAfter: withBalanceAfter ? nextAfter : undefined,
      tx,
    });
    nextAfter -= tx.amountGhs ?? 0;
  }

  return (
    <div className="max-w-[1120px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Agents", href: LIST }]}
        current="Agent details"
      />
      <DetailHeader
        title="Agent details"
        hint="One field buyer: the money they hold, what they spent it on, and the last count."
        actions={
          <>
            {/* Statement is a read - anyone with agent access can print it. */}
            <AdminButton variant="secondary" asChild>
              <Link href={`/admin/agents/${agentUserId}/statement`}>
                Statement
              </Link>
            </AdminButton>
            {/* Float money moves are owner actions; staff only ever view
                them. The API enforces it; hiding the buttons keeps staff from
                being offered an action that can only 403. */}
            {isSuperAdmin ? (
              <>
                <AdminButton
                  variant="secondary"
                  onClick={() => setReconcileOpen(true)}
                >
                  Reconcile
                </AdminButton>
                <AdminButton
                  onClick={() => setTopUpOpen(true)}
                >
                  Top up float
                </AdminButton>
              </>
            ) : null}
          </>
        }
      />

      {/* Above the ledger, because it is the question the ledger cannot answer
          on its own: the rows below walk HELD accounts, and a send made on
          spending authority debits the company's wallet without touching one.
          A reader who saw only the ledger read an agent who had moved thousands
          of the company's money as having spent nothing. */}
      {/* Who this is, before anything about their money. A band rather than a
          stack: an avatar beside a name and four short facts is a row, and
          spending a column of the page on it puts the ledger below the fold. */}
      <AdminCard className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <ViewablePhoto name={name} size={52} src={agent.profilePicture} />
          <div className="min-w-0">
            <p className="min-w-0 text-[13.5px] font-bold text-adm-ink [overflow-wrap:anywhere]">
              {name}
            </p>
            <p className="text-[11px] text-adm-muted">
              Joined {formatDateTime(agent.createdAt)}
            </p>
          </div>
        </div>
        <dl className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-8 gap-y-2">
          <IdentityFact label="Status">
            <ToneBadge tone={agent.isActive ? "leaf" : "slate"}>
              {agent.isActive ? "Active" : "Suspended"}
            </ToneBadge>
          </IdentityFact>
          <IdentityFact label="Region">
            {agent.region ?? <span className="text-adm-faint">Not set</span>}
          </IdentityFact>
          <IdentityFact label="Phone">
            {agent.phone ? (
              <Mono className="text-[11.5px]">{agent.phone}</Mono>
            ) : (
              <span className="text-adm-faint">Not set</span>
            )}
          </IdentityFact>
          <IdentityFact label="Email">
            <span className="[overflow-wrap:anywhere]">{agent.email}</span>
          </IdentityFact>
        </dl>
      </AdminCard>

      <AgentMoneySummaryCard agentUserId={agentUserId} />

      {/* The ledger card names its own container: the fourth (balance) track
          appears on the CARD's width, not the viewport's - the card is 340px
          narrower than the page whenever the side rail is showing. */}
      <DetailShell
        main={
          <AdminCard className="@container/ledger px-5 py-3.5">
            <SectionHeading
              actions={
                totalTx > 0 ? (
                  <Mono className="text-[10.5px] text-adm-faint">
                    {totalTx} {totalTx === 1 ? "entry" : "entries"}
                  </Mono>
                ) : null
              }
              hint="Every movement in and out of this agent's money, newest first, so a balance can always be traced."
            >
              Float ledger
            </SectionHeading>
            {ledger.isLoading ? (
              <LedgerSkeleton rows={5} />
            ) : transactions.length === 0 ? (
              <p className="py-2 text-[11.5px] text-adm-muted">
                Nothing in the ledger yet - the first top-up opens it.
              </p>
            ) : (
              <>
                <LedgerHead withBalance={withBalanceAfter} />
                {ledgerRows.map(({ balanceAfter, tx }) => (
                  <LedgerRow
                    key={tx.id}
                    tx={tx}
                    balanceAfter={balanceAfter}
                    withBalanceColumn={withBalanceAfter}
                  />
                ))}
                {/* Say why the column is missing rather than leaving a reader
                    to wonder whether the balances simply stopped existing. */}
                {!withBalanceAfter && ledgerPage > 1 ? (
                  <p className="mt-2 text-[10.5px] text-adm-faint">
                    Running balances are shown on the first page only - they are
                    walked back from the live float.
                  </p>
                ) : null}
                <ListPagination
                  page={ledgerPage}
                  totalPages={Math.max(1, Math.ceil(totalTx / 10))}
                  onPageChange={setLedgerPage}
                  className="mt-2"
                />
              </>
            )}
          </AdminCard>
        }
        aside={
          <div className="flex flex-col gap-4">
            <AdminCard
              className={cn(
                "px-5 py-4",
                balance !== null &&
                  balance < 0 &&
                  "border-console-red/40 bg-console-red/[0.04]",
              )}
            >
              {/* The figures as ONE block: the headline float, then the
                  supporting numbers as ruled label/value lines sharing a right
                  edge. As three loose sentences the eye has to hunt for the
                  money in each one. */}
              <p className="flex min-w-0 items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                <span className="min-w-0">Cash in hand</span>
                <HelpTip
                  label="What is cash in hand?"
                  text="What the ledger says this agent still holds of your money, after every top-up and everything they have spent."
                />
              </p>
              <p
                className={cn(
                  "font-adminmono mt-1 text-[26px] font-bold tabular-nums",
                  balance === null
                    ? "text-adm-faint"
                    : balance < 0
                      ? "text-console-red"
                      : "text-adm-ink",
                )}
              >
                {formatCedis(balance)}
              </p>
              {balance !== null && balance < 0 ? (
                <p className="mt-0.5 text-[11px] text-console-red">
                  Negative float - {agent.firstName} is fronting their own cash.
                </p>
              ) : null}
              <dl className="mt-3 border-t border-adm-hairline pt-1.5">
                <FigureLine label="Ledger entries">
                  <Mono>{totalTx}</Mono>
                </FigureLine>
                <FigureLine
                  hint="The cash actually counted in front of you at the most recent sit-down count."
                  label="Last counted"
                >
                  {agent.lastReconciliation ? (
                    <Mono>
                      {formatCedis(agent.lastReconciliation.countedGhs)}
                    </Mono>
                  ) : (
                    <span className="text-adm-faint">Never</span>
                  )}
                </FigureLine>
                {agent.lastReconciliation ? (
                  <FigureLine label="Counted on">
                    {formatConsoleDate(agent.lastReconciliation.performedAt)}
                  </FigureLine>
                ) : null}
              </dl>
            </AdminCard>

            {(recons.data?.data.length ?? 0) > 0 ? (
              <AdminCard className="px-5 py-3">
                <SectionHeading
                  className="mb-1"
                  hint="A sit-down cash count: what the books expected against what was actually in the agent's hand."
                >
                  Reconciliations
                </SectionHeading>
                {(recons.data?.data ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-baseline justify-between gap-3 border-b border-adm-hairline py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[11.5px] text-adm-ink">
                        {formatConsoleDate(r.performedAt)}
                      </p>
                      <p className="truncate text-[10.5px] text-adm-faint">
                        Expected {formatCedis(r.expectedGhs)} · counted{" "}
                        {formatCedis(r.countedGhs)}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                    </div>
                    <Mono
                      className={cn(
                        "text-[11px] font-semibold whitespace-nowrap",
                        r.varianceGhs === null
                          ? "text-adm-faint"
                          : r.varianceGhs === 0
                            ? "text-console"
                            : r.varianceGhs > 0
                              ? "text-adm-muted"
                              : "text-console-red",
                      )}
                    >
                      {r.varianceGhs === null
                        ? MONEY_HIDDEN
                        : r.varianceGhs === 0
                          ? "Exact"
                          : `${r.varianceGhs > 0 ? "+" : "-"}${formatCedis(Math.abs(r.varianceGhs))}`}
                    </Mono>
                  </div>
                ))}
                <ListPagination
                  page={reconPage}
                  totalPages={Math.max(
                    1,
                    Math.ceil((recons.data?.meta.total ?? 0) / RECON_PAGE_SIZE),
                  )}
                  onPageChange={setReconPage}
                  className="mt-2"
                />
              </AdminCard>
            ) : null}
          </div>
        }
      />

      {topUpOpen ? (
        <TopUpDialog
          agentUserId={agentUserId}
          agentFirstName={agent.firstName}
          agentName={name}
          open={topUpOpen}
          onClose={() => setTopUpOpen(false)}
        />
      ) : null}
      {reconcileOpen ? (
        <ReconcileDialog
          agentUserId={agentUserId}
          agentName={name}
          open={reconcileOpen}
          onClose={() => setReconcileOpen(false)}
        />
      ) : null}
    </div>
  );
}
