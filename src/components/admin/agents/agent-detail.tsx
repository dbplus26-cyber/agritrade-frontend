"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
  DetailShell,
  Mono,
  TONES,
  type Tone,
} from "@/components/admin/ui";
import { DateTimeCell } from "@/components/admin/date-cell";
import { RegistryAvatar } from "@/components/admin/registry/supplier-screens";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
import { formatDateTime } from "@/lib/format-date";
import { formatCedis, MONEY_HIDDEN } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  FloatTxType,
  PaymentMethod,
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

const TX_LABEL: Record<FloatTxType, string> = {
  [FloatTxType.TOP_UP]: "Top-up",
  [FloatTxType.PURCHASE]: "Purchase",
  [FloatTxType.FIELD_EXPENSE]: "Field expense",
  [FloatTxType.ADJUSTMENT]: "Adjustment",
};

const TX_TONE: Record<FloatTxType, Tone> = {
  [FloatTxType.TOP_UP]: "leaf",
  [FloatTxType.PURCHASE]: "sky",
  [FloatTxType.FIELD_EXPENSE]: "harvest",
  [FloatTxType.ADJUSTMENT]: "slate",
};

/** Two-letter ledger markers, stamped in the type's tone. */
const TX_CODE: Record<FloatTxType, string> = {
  [FloatTxType.TOP_UP]: "TU",
  [FloatTxType.PURCHASE]: "PU",
  [FloatTxType.FIELD_EXPENSE]: "FE",
  [FloatTxType.ADJUSTMENT]: "AD",
};

/** Square type marker at the head of a ledger line (label in the tooltip). */
function TxMarker({ type }: { type: FloatTxType }) {
  const t = TONES[TX_TONE[type]];
  return (
    <span
      title={TX_LABEL[type]}
      className="font-adminmono mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-[2px] text-[10px] font-bold"
      style={{ background: t.bg, color: t.fg }}
    >
      {TX_CODE[type]}
      <span className="sr-only">{TX_LABEL[type]}</span>
    </span>
  );
}

const METHOD_OPTIONS = [
  { value: PaymentMethod.CASH, label: "Cash" },
  { value: PaymentMethod.MOMO, label: "Mobile money" },
  { value: PaymentMethod.BANK, label: "Bank" },
] as const;

function SignedAmount({ amount }: { amount: number | null }) {
  if (amount === null) {
    return (
      <Mono className="whitespace-nowrap text-[13px] text-soil/50">
        {MONEY_HIDDEN}
      </Mono>
    );
  }
  return (
    <Mono
      className={cn(
        "whitespace-nowrap text-[13px] font-semibold",
        amount < 0 ? "text-error" : "text-leaf",
      )}
    >
      {amount < 0 ? "-" : "+"}
      {formatCedis(Math.abs(amount))}
    </Mono>
  );
}

/**
 * One ledger line: type marker, reason, document number + date, signed amount
 * and (page 1, money visible) the balance the float sat at after this entry.
 */
function LedgerRow({
  tx,
  balanceAfter,
}: {
  tx: IFloatTransaction;
  balanceAfter?: number;
}) {
  return (
    <div className="flex items-start gap-2.5 border-b border-soil/12 py-2.5 last:border-b-0">
      <TxMarker type={tx.type} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink line-clamp-1 [overflow-wrap:anywhere]">
            {tx.reason ??
              (tx.purchaseId
                ? "Paid from float for a purchase"
                : TX_LABEL[tx.type])}
            {tx.method ? (
              <span className="text-soil/60"> · {tx.method}</span>
            ) : null}
          </p>
          <SignedAmount amount={tx.amountGhs} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            <Mono className="text-[11px] text-soil/70">{tx.transactionNo}</Mono>
            <DateTimeCell value={tx.occurredAt} muted />
            {tx.purchaseId ? (
              <Link
                href={`/admin/purchases/${tx.purchaseId}`}
                className="text-[11.5px] text-forest underline-offset-2 hover:underline"
              >
                View purchase
              </Link>
            ) : null}
          </span>
          {balanceAfter !== undefined ? (
            <Mono className="text-[11px] whitespace-nowrap text-soil/70">
              Bal {formatCedis(balanceAfter)}
            </Mono>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TopUpDialog({
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
  const [topUp, { isLoading }] = useTopUpAgentMutation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TopUpValues>({
    resolver: zodResolver(topUpSchema),
    defaultValues: { amountGhs: "", method: PaymentMethod.CASH, reason: "" },
  });

  const onSubmit = async (values: TopUpValues) => {
    try {
      await topUp({
        agentUserId,
        body: {
          amountGhs: Number(values.amountGhs),
          method: values.method,
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
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Top up {agentName}&apos;s float</DialogTitle>
          <DialogDescription>
            Cash or mobile money handed to the agent for village purchases.
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Amount (GH₵)" error={errors.amountGhs?.message}>
            <Input
              inputMode="decimal"
              placeholder="e.g. 2000"
              className={cn(adminInputClass, errors.amountGhs && "border-error")}
              {...register("amountGhs")}
            />
          </AdminField>
          <AdminField label="Method">
            <select className={cn(adminSelectClass, "w-full")} {...register("method")}>
              {METHOD_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Note" optional error={errors.reason?.message}>
            <Input
              placeholder="e.g. Season opening float"
              className={adminInputClass}
              {...register("reason")}
            />
          </AdminField>
          <DialogFooter className="gap-2">
            <AdminButton type="button" variant="outline" className="h-9 px-3.5" onClick={onClose}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={isLoading} className="h-9 px-4">
              {isLoading ? "Topping up…" : "Top up float"}
            </AdminButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="min-w-0 text-[12px] text-soil [overflow-wrap:anywhere]">{label}</span>
      <Mono className="text-[12.5px] text-ink">
        {sign ?? ""}
        {formatCedis(Math.abs(amount))}
      </Mono>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Reconcile {agentName}&apos;s float</DialogTitle>
          <DialogDescription>
            The computation below is what the ledger says should be in hand.
            Count the cash together, enter it, and any difference posts as a
            signed adjustment - the ledger is never rewritten.
          </DialogDescription>
        </DialogHeader>

        {preview.isLoading ? (
          <p className="py-2 text-[13px] text-soil">Computing…</p>
        ) : preview.isError || !p ? (
          <ErrorMessage
            description={extractApiError(preview.error).message}
            onRetry={() => void preview.refetch()}
          />
        ) : (
          <>
            <div className="rounded border border-soil/20 bg-surface-alt/50 px-3 py-2">
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
              <div className="ledger-rule mt-1 flex items-baseline justify-between pt-1.5">
                <span className="text-[11px] font-bold tracking-[0.09em] text-soil uppercase">
                  Expected in hand
                </span>
                <Mono className="text-[14px] font-semibold text-ink">
                  {formatCedis(p.expectedGhs)}
                </Mono>
              </div>
            </div>

            <form
              noValidate
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-3"
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
                    errors.countedGhs && "border-error",
                  )}
                  {...register("countedGhs")}
                />
              </AdminField>
              {variance !== null && !Number.isNaN(variance) ? (
                <p
                  className={cn(
                    "text-[12.5px] font-medium",
                    variance === 0
                      ? "text-leaf"
                      : variance > 0
                        ? "text-harvest-deep"
                        : "text-error",
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
              <DialogFooter className="gap-2">
                <AdminButton
                  type="button"
                  variant="outline"
                  className="h-9 px-3.5"
                  onClick={onClose}
                >
                  Cancel
                </AdminButton>
                <AdminButton
                  type="submit"
                  disabled={isLoading}
                  className="h-9 px-4"
                >
                  {isLoading ? "Posting…" : "Post reconciliation"}
                </AdminButton>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AgentDetail({ agentUserId }: { agentUserId: string }) {
  const detail = useGetAgentQuery(agentUserId);
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledger = useGetAgentFloatQuery({
    agentUserId,
    params: { page: ledgerPage, limit: 10 },
  });
  const recons = useGetAgentReconciliationsQuery({ agentUserId, limit: 5 });
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const { isSuperAdmin } = useAuthRole();

  if (detail.isLoading) return <DataTableSkeleton />;
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
      <BackButton href={LIST} label="All agents" className="mb-2" />
      <AdminPageHeader
        title={name}
        sub={agent.region ?? agent.email}
        actions={
          <div className="flex flex-wrap gap-2">
            {/* Statement is a read - anyone with agent access can print it. */}
            <AdminButton variant="secondary" className="h-9 px-3.5" asChild>
              <Link href={`/admin/agents/${agentUserId}/statement`}>
                Statement
              </Link>
            </AdminButton>
            {/* Float money moves are owner actions (design doc 4: staff view
                only). The API enforces it; hiding the buttons keeps staff from
                being offered an action that can only 403. */}
            {isSuperAdmin ? (
              <>
                <AdminButton
                  variant="secondary"
                  className="h-9 px-3.5"
                  onClick={() => setReconcileOpen(true)}
                >
                  Reconcile
                </AdminButton>
                <AdminButton
                  className="h-9 px-4"
                  onClick={() => setTopUpOpen(true)}
                >
                  Top up float
                </AdminButton>
              </>
            ) : null}
          </div>
        }
      />

      <DetailShell
        main={
          <AdminCard className="px-5 py-3">
            <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Float ledger
            </p>
            {ledger.isLoading ? (
              <p className="py-2 text-[13px] text-soil">Loading ledger…</p>
            ) : transactions.length === 0 ? (
              <p className="py-2 text-[13px] text-soil">
                Nothing in the ledger yet - the first top-up opens it.
              </p>
            ) : (
              <>
                {ledgerRows.map(({ balanceAfter, tx }) => (
                  <LedgerRow key={tx.id} tx={tx} balanceAfter={balanceAfter} />
                ))}
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
                  "border-error/40 bg-error/[0.04]",
              )}
            >
              <div className="mb-3 flex items-center gap-3 border-b border-soil/12 pb-3">
                <RegistryAvatar
                  name={name}
                  photoUrl={agent.profilePicture}
                  size={56}
                />
                <div className="min-w-0">
                  <p className="min-w-0 text-[14px] font-bold text-ink line-clamp-1 [overflow-wrap:anywhere]">
                    {name}
                  </p>
                  <p className="text-[12px] text-soil">
                    Joined {formatDateTime(agent.createdAt)}
                  </p>
                </div>
              </div>
              <p className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                Float balance
              </p>
              <p
                className={cn(
                  "font-adminmono mt-1 text-[26px] font-bold tabular-nums",
                  balance === null
                    ? "text-soil/50"
                    : balance < 0
                      ? "text-error"
                      : "text-ink",
                )}
              >
                {formatCedis(balance)}
              </p>
              {balance !== null && balance < 0 ? (
                <p className="mt-0.5 text-[12px] text-error">
                  Negative float - {agent.firstName} is fronting their own cash.
                </p>
              ) : null}
              {agent.lastReconciliation ? (
                <p className="mt-1.5 text-[12px] text-soil">
                  Last reconciled{" "}
                  {formatConsoleDate(agent.lastReconciliation.performedAt)} (
                  {formatCedis(agent.lastReconciliation.countedGhs)} counted)
                </p>
              ) : (
                <p className="mt-1.5 text-[12px] text-soil">
                  Never reconciled yet.
                </p>
              )}
            </AdminCard>

            {(recons.data?.data.length ?? 0) > 0 ? (
              <AdminCard className="px-5 py-3">
                <p className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
                  Reconciliations
                </p>
                {(recons.data?.data ?? []).map((r) => (
                  <div
                    key={r.id}
                    className="flex items-baseline justify-between gap-3 border-b border-soil/12 py-2 last:border-b-0"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-ink">
                        {formatConsoleDate(r.performedAt)}
                      </p>
                      <p className="truncate text-[11.5px] text-soil/70">
                        Expected {formatCedis(r.expectedGhs)} · counted{" "}
                        {formatCedis(r.countedGhs)}
                        {r.notes ? ` · ${r.notes}` : ""}
                      </p>
                    </div>
                    <Mono
                      className={cn(
                        "text-[12.5px] font-semibold whitespace-nowrap",
                        r.varianceGhs === null
                          ? "text-soil/50"
                          : r.varianceGhs === 0
                            ? "text-leaf"
                            : r.varianceGhs > 0
                              ? "text-harvest-deep"
                              : "text-error",
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
              </AdminCard>
            ) : null}
          </div>
        }
      />

      {topUpOpen ? (
        <TopUpDialog
          agentUserId={agentUserId}
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
