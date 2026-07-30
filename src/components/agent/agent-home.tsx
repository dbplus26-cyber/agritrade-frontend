"use client";

import Link from "next/link";
import { useGetMyFloatQuery } from "@/redux/agent/agent-api";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { FloatTxType, type IFloatTransaction } from "@/types/agent.types";

const TX_LABEL: Record<FloatTxType, string> = {
  [FloatTxType.TOP_UP]: "Top-up",
  [FloatTxType.PURCHASE]: "Purchase",
  [FloatTxType.FIELD_EXPENSE]: "Expense",
  [FloatTxType.ADJUSTMENT]: "Adjustment",
  [FloatTxType.DISBURSEMENT]: "Money sent",
};

function LedgerLine({ tx }: { tx: IFloatTransaction }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-soil/15 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">{TX_LABEL[tx.type]}</p>
        <p className="truncate text-[11.5px] text-soil/75">
          {new Date(tx.occurredAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
          })}
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

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-lg border border-soil/25 bg-paper px-4 py-4">
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

      <div className="grid grid-cols-1 gap-2.5">
        <Link
          href="/agent/purchases/new"
          className="rounded-lg bg-forest px-4 py-3.5 text-center text-[15px] font-semibold text-paper transition-colors hover:bg-board"
        >
          Record a purchase
        </Link>
        <Link
          href="/agent/sends"
          className="rounded-lg border-[1.5px] border-forest bg-paper px-4 py-3.5 text-center text-[15px] font-semibold text-forest transition-colors hover:bg-surface-alt"
        >
          Send money
        </Link>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href="/agent/expenses/new"
            className="rounded-lg border border-soil/35 bg-paper px-4 py-3 text-center text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-alt"
          >
            Record expense
          </Link>
          <Link
            href="/agent/purchases"
            className="rounded-lg border border-soil/35 bg-paper px-4 py-3 text-center text-[13.5px] font-medium text-ink transition-colors hover:bg-surface-alt"
          >
            My purchases
          </Link>
        </div>
      </div>

      <section className="rounded-lg border border-soil/25 bg-paper px-4 py-3">
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
