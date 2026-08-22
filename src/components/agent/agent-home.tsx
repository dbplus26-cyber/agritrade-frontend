"use client";

import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";
import {
  useGetMyFloatQuery,
  useGetMySpendingQuery,
} from "@/redux/agent/agent-api";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import type { IFloatTransaction, IHeldPot } from "@/types/agent.types";

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

/** What each pot is, in the words an agent uses for it. */
const POT_LABEL: Record<string, string> = {
  BANK: "In your bank",
  CASH: "Cash in hand",
  MOMO: "In your wallet",
  OTHER: "Held",
};

/**
 * One pot, with its own balance.
 *
 * Separately, deliberately. Cash in a pocket, money in an agent's own wallet
 * and money in their own bank are three different things to somebody standing
 * at a village scale, and a single figure covering all three makes their
 * position unreadable: cash still in hand reads as spent because a
 * mobile-money send came off the same total.
 */
function Pot({ pot }: { pot: IHeldPot }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-soil/15 py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">
          {POT_LABEL[pot.kind] ?? POT_LABEL.OTHER}
        </p>
        {/* The account's own label, so a person can tell two wallets apart.
            Wrapped rather than truncated: on a phone this is the line that
            says WHICH pot, and half a name answers nothing. */}
        <p className="text-[11.5px] break-words text-soil/75">{pot.label}</p>
      </div>
      <span
        className={cn(
          "font-mono text-[15px] font-semibold whitespace-nowrap tabular-nums",
          pot.balanceGhs < 0 ? "text-error" : "text-ink",
        )}
      >
        {formatCedis(pot.balanceGhs)}
      </span>
    </div>
  );
}

/**
 * What the agent may still SEND, which is not what they are holding.
 *
 * Its own card, its own words, never a figure beside the pots. Money somebody
 * holds falls when they spend it; an allowance is permission to draw on an
 * account belonging to the business, and what falls when it is used is the
 * company's account. Showing them as one number is the mistake this split
 * exists to prevent, and two cards that merely sit near each other bring it
 * back.
 */
function SendingAllowance() {
  const { data, isError, isLoading } = useGetMySpendingQuery();

  return (
    <section className="rounded-none border border-soil/25 bg-paper px-4 py-4">
      <p className="text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
        You may still send
      </p>
      {isLoading ? (
        <p className="mt-1 text-[15px] text-soil">Loading…</p>
      ) : isError || !data ? (
        // Not an error state. The ordinary reason this read fails is that
        // nobody has given this person permission to send, and telling them
        // that plainly beats a retry button that will fail again.
        <p className="mt-1 text-[13px] text-soil">
          You have not been allowed to send money yet. Ask the office.
        </p>
      ) : data.data.spending.capGhs === null ? (
        <>
          <p className="mt-1 font-mono text-[22px] font-bold text-ink tabular-nums">
            No limit
          </p>
          <p className="text-[12px] text-soil/80">
            The office has set no ceiling. A send still needs the money to be
            there in the company account.
          </p>
        </>
      ) : (
        <>
          <p className="mt-1 font-mono text-[22px] font-bold text-ink tabular-nums">
            {formatCedis(data.data.spending.remainingGhs)}
          </p>
          <p className="text-[12px] text-soil/80">
            {formatCedis(data.data.spending.usedGhs)} of{" "}
            {formatCedis(data.data.spending.capGhs)} used. This is the
            company&apos;s money, not what you are holding.
          </p>
        </>
      )}
    </section>
  );
}

/** The agent's landing screen: my pots, what I may send, my last movements. */
export function AgentHome() {
  const { data, isLoading, isError, error, refetch } = useGetMyFloatQuery({
    limit: 5,
  });
  const balance = data?.summary.balanceGhs ?? 0;
  const pots = data?.summary.pots ?? [];
  const { has } = usePermissions();
  const canBuy = has("PURCHASES_RECORD");
  const canSend = has("PAYOUTS_SEND");
  const canExpense = has("EXPENSES_RECORD");

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-none border border-soil/25 bg-paper px-4 py-4">
        <p className="text-[11px] font-bold tracking-[0.08em] text-soil uppercase">
          You are holding
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
            {pots.length === 0 ? (
              <p className="mt-2 text-[13px] text-soil">
                Nothing has been handed to you yet.
              </p>
            ) : (
              <div className="mt-3 border-t border-soil/25 pt-1">
                {pots.map((pot) => (
                  <Pot key={pot.id} pot={pot} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      <SendingAllowance />

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
