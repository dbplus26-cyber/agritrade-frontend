"use client";

import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import { useGetMyFloatQuery } from "@/redux/agent/agent-api";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type { IFloatTransaction } from "@/types/agent.types";

// The ledger is the cash book now, so its lines are movement types. Unknown
// types fall back to their own name rather than rendering `undefined`: the
// cash book gains types over time and a field app that breaks on one it has
// not met is worse than one that shows it plainly.
const TX_LABEL: Record<string, string> = {
  CAPITAL: "Own money in",
  CHARGE: "Charge",
  CORRECTION: "Adjustment",
  DEPOSIT: "Money in",
  PAYMENT: "Spent",
  RECEIPT: "Received",
  TRANSFER_IN: "Given to you",
  TRANSFER_OUT: "Sent back",
  WITHDRAWAL: "Money out",
};

function LedgerLine({ tx }: { tx: IFloatTransaction }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-soil/15 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{TX_LABEL[tx.type] ?? tx.type}</p>
        <p className="truncate text-[11.5px] text-soil/75">
          {new Date(tx.occurredAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}
          {` · ${tx.account.label}`}
          {tx.reason ? ` · ${tx.reason}` : ""}
        </p>
      </div>
      <span
        className={cn(
          "font-mono text-[13px] font-semibold whitespace-nowrap tabular-nums",
          // An agent always sees their own money, so null cannot occur here -
          // it is handled rather than asserted away.
          (tx.amountGhs ?? 0) < 0 ? "text-error" : "text-forest",
        )}
      >
        {tx.amountGhs === null ? null : tx.amountGhs < 0 ? "-" : "+"}
        {formatCedis(tx.amountGhs === null ? null : Math.abs(tx.amountGhs))}
      </span>
    </div>
  );
}

/** The agent's landing screen: my cash, my last movements, the big actions. */
export function AgentHome() {
  const { data, isLoading, isError, error, refetch } = useGetMyFloatQuery({
    limit: 5,
  });
  const balance = data?.summary.balanceGhs ?? 0;
  const { has } = usePermissions();
  const canBuy = has("PURCHASES_RECORD");
  const canSend = has("PAYOUTS_SEND");
  const canExpense = has("EXPENSES_RECORD");

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-none border border-soil/25 bg-paper px-4 py-4">
        <p className="text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
          My float
        </p>
        {isLoading ? (
          <p className="mt-1 text-[15px] text-soil">Loading…</p>
        ) : isError ? (
          <div className="mt-1">
            <p className="text-[13px] text-error">
              {extractApiError(error).message}
            </p>
            <button
              type="button"
              onClick={() => void refetch()}
              className="mt-1 text-[13px] font-medium text-forest underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <p
              className={cn(
                "mt-1 font-mono text-[28px] font-bold tabular-nums",
                balance < 0 ? "text-error" : "text-ink",
              )}
            >
              {formatCedis(balance)}
            </p>
            {balance < 0 ? (
              <p className="text-[12px] text-error">
                You are fronting your own cash - tell the office.
              </p>
            ) : null}
          </>
        )}
      </section>

      {/* Only the actions this agent actually HOLDS - the owner switches
          them per role or per person on the console's Permissions screen,
          and a button that would only 403 is worse than no button. */}
      <div className="grid grid-cols-1 gap-2.5">
        {canBuy ? (
          <Link
            href="/agent/purchases/new"
            className="rounded-none bg-forest px-4 py-3.5 text-center text-[15px] font-semibold text-paper transition-colors hover:bg-board"
          >
            Record a purchase
          </Link>
        ) : null}
        {canSend ? (
          <Link
            href="/agent/sends"
            className="rounded-none border-[1.5px] border-forest bg-paper px-4 py-3.5 text-center text-[15px] font-semibold text-forest transition-colors hover:bg-surface-alt"
          >
            Send money
          </Link>
        ) : null}
        <div className="grid grid-cols-2 gap-2.5">
          {canExpense ? (
            <Link
              href="/agent/expenses/new"
              className="rounded-none border border-soil/35 bg-paper px-4 py-3 text-center text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-alt"
            >
              Record expense
            </Link>
          ) : null}
          <Link
            href="/agent/purchases"
            className={cn(
              "rounded-none border border-soil/35 bg-paper px-4 py-3 text-center text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-alt",
              !canExpense && "col-span-2",
            )}
          >
            My purchases
          </Link>
        </div>
        {!canBuy && !canSend && !canExpense ? (
          <div className="rounded-none border border-soil/25 bg-paper px-4 py-3 text-[12.5px] leading-[1.55] text-soil">
            The office has not opened any actions for your account yet. Your
            float and history stay visible; call the office if this seems
            wrong.
          </div>
        ) : null}
      </div>

      <section className="rounded-none border border-soil/25 bg-paper px-4 py-3">
        <p className="mb-1 text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
          Recent movements
        </p>
        {isLoading ? (
          <p className="py-1 text-[13px] text-soil">Loading…</p>
        ) : (data?.data.length ?? 0) === 0 ? (
          <p className="py-1 text-[13px] text-soil">
            Nothing yet - your float opens with the office&apos;s first top-up.
          </p>
        ) : (
          (data?.data ?? []).map((tx) => <LedgerLine key={tx.id} tx={tx} />)
        )}
      </section>
    </div>
  );
}
