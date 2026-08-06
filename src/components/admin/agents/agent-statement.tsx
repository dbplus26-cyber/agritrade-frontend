"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminButton, AdminPageHeader, Mono } from "@/components/admin/ui";
import { ConsoleDateRange } from "@/components/admin/filter-bar";
import { DocumentSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly, formatDateTime } from "@/lib/format-date";
import { formatCedis, MONEY_HIDDEN } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import {
  useGetAgentFloatQuery,
  useGetAgentQuery,
} from "@/redux/agents/agents-api";
import type { IFloatTransaction } from "@/types/agent.types";

const TX_LABEL: Record<string, string> = {
  ADJUSTMENT: "Adjustment",
  DISBURSEMENT: "Money sent",
  FIELD_EXPENSE: "Field expense",
  PURCHASE: "Purchase",
  TOP_UP: "Top-up",
};

const formatDate = (iso: string): string => formatDateTime(iso);

/** The API's hard page cap - a statement can only print one page of it. */
const PAGE_LIMIT = 100;

/** The statement's money face: right-aligned mono on a fixed column edge. */
function Figure({
  value,
  className,
}: {
  /** null when the API redacted the figure for this reader. */
  value: number | null;
  className?: string;
}) {
  return (
    <Mono
      className={cn(
        "block whitespace-nowrap text-right",
        value === null && "text-adm-faint",
        className,
      )}
    >
      {value === null ? MONEY_HIDDEN : formatCedis(value)}
    </Mono>
  );
}

/**
 * A print-friendly agent float statement (design doc 5.2, ADR-004): every
 * top-up, purchase, expense and adjustment with a running balance, from live
 * data. A4-styled via `print:` utilities.
 *
 * Money arrives as `number | null` - null means the reader has no financial
 * visibility. A redacted amount cannot be added up, so the running balance is
 * dropped for the whole statement rather than quietly treating hidden figures
 * as zero and printing a column of confident wrong numbers.
 */
export function AgentStatement({ id }: { id: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const agent = useGetAgentQuery(id);
  const float = useGetAgentFloatQuery({
    agentUserId: id,
    params: {
      // The API caps a page at 100. It used to ask for 500, which failed
      // validation, so the statement silently printed "No float activity yet"
      // over a real balance - the one thing a statement must never do.
      limit: PAGE_LIMIT,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });

  if (agent.isLoading || float.isLoading) return <DocumentSkeleton />;
  if (agent.isError || !agent.data)
    return (
      <ErrorMessage
        description={extractApiError(agent.error).message}
        onRetry={() => void agent.refetch()}
      />
    );
  // A statement with no ledger is not a statement. Fail loudly rather than
  // printing an empty sheet that reads as "this agent has done nothing".
  if (float.isError || !float.data)
    return (
      <ErrorMessage
        description={extractApiError(float.error).message}
        onRetry={() => void float.refetch()}
      />
    );

  const a = agent.data.data.agent;
  // The ledger arrives newest-first; a statement reads oldest-first with a
  // running balance, so reverse a copy and accumulate.
  const ledger = [...(float.data?.data ?? [])].reverse();
  const opening = float.data?.summary.openingBalanceGhs ?? null;
  const balance = float.data?.summary.balanceGhs ?? a.balanceGhs;
  const closing = float.data?.summary.closingBalanceGhs ?? null;
  // A balance can only be walked when every figure feeding it is visible.
  const canRun = opening !== null && ledger.every((t) => t.amountGhs !== null);
  // Running balance in a single pass, STARTING from everything before the
  // window. Beginning at zero would print a column that looks like a balance
  // and is not one - which is the whole reason the API reports an opening
  // figure rather than only the rows inside the period.
  const rows = ledger.reduce<
    { runningAfter: number | null; tx: IFloatTransaction }[]
  >((acc, tx) => {
    if (!canRun) {
      acc.push({ runningAfter: null, tx });
      return acc;
    }
    const previous = acc[acc.length - 1];
    const prev = previous ? (previous.runningAfter ?? 0) : (opening ?? 0);
    acc.push({ runningAfter: prev + (tx.amountGhs ?? 0), tx });
    return acc;
  }, []);
  const windowed = Boolean(from || to);
  const lastRow = rows[rows.length - 1];
  const lastRunning = lastRow ? lastRow.runningAfter : opening;
  const netOverPeriod =
    lastRunning !== null && opening !== null ? lastRunning - opening : null;

  return (
    <div>
      <div className="print:hidden">
        <Link
          href={`/admin/agents/${id}`}
          className="mb-2 inline-block text-[13px] text-console underline-offset-2 hover:underline"
        >
          ← Back to agent
        </Link>
        <AdminPageHeader
          title={`${a.firstName} ${a.lastName} - float statement`}
          sub="Every top-up, purchase and expense against the cash this agent holds, ready to print and sign"
          actions={
              // No server-rendered PDF for a statement: the API's receipt
              // types cover single documents (a voucher, an invoice, a
              // waybill), not a ledger over a period. So this one really does
              // print the page - which is now only the sheet, since the shell
              // hides itself for print.
            <AdminButton className="h-9 px-4" onClick={() => window.print()}>
              Print
            </AdminButton>
          }
        />
        {/* The window belongs to the DOCUMENT, not to a list, so it sits with
            the sheet rather than in a toolbar above the heading. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ConsoleDateRange
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          {windowed ? (
            <AdminButton
              variant="outline"
              className="h-8 px-3"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              All history
            </AdminButton>
          ) : null}
        </div>
      </div>

      {/* Left-aligned like every other console page - the sheet keeps its own
          720px measure so it still reads as a piece of paper. */}
      <div className="max-w-[720px] rounded-[8px] border border-adm-line bg-white p-8 text-adm-ink">
        <div className="flex items-start justify-between gap-4 border-b-2 border-adm-strong pb-3">
          <div>
            <div className="text-[20px] font-extrabold tracking-[0.12em] text-console">
              DB PLUS
            </div>
            <div className="text-[11px] tracking-[0.06em] text-adm-muted uppercase">
              Trading · Tamale
            </div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-bold">FLOAT STATEMENT</div>
            <div className="text-[12px] text-adm-muted">
              {a.firstName} {a.lastName}
            </div>
            <div className="text-[12px] text-adm-muted">
              Printed {formatDate(new Date().toISOString())}
            </div>
            <div className="text-[12px] text-adm-muted">
              {windowed
                ? `Period ${from ? formatDateOnly(from) : "start"} to ${to ? formatDateOnly(to) : "today"}`
                : "All history"}
            </div>
          </div>
        </div>

        {/* Fixed money columns so every figure lands on the same right edge
            whatever the description beside it does. */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] table-fixed border-collapse text-[13px]">
            <colgroup>
              <col className="w-[92px]" />
              <col />
              <col className="w-[124px]" />
              <col className="w-[124px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-adm-strong align-bottom text-left text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
                <th className="py-2">Date</th>
                <th className="py-2">Detail</th>
                <th className="py-2 text-right">In / out</th>
                <th className="py-2 text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {/* Carried in, so the balance column is a real balance from its
                  first row rather than a period subtotal wearing the name. */}
              {windowed && from ? (
                <tr className="border-b border-adm-line">
                  <td className="py-1.5 align-top whitespace-nowrap text-adm-muted">
                    {formatDateOnly(from)}
                  </td>
                  <td className="py-1.5 align-top text-adm-muted">
                    Balance brought forward
                  </td>
                  <td className="py-1.5 text-right align-top text-adm-muted">-</td>
                  <td className="py-1.5 align-top">
                    <Figure value={opening} className="font-semibold" />
                  </td>
                </tr>
              ) : null}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-adm-muted">
                    {windowed
                      ? "No float activity in this period."
                      : "No float activity yet."}
                  </td>
                </tr>
              ) : (
                rows.map(({ runningAfter, tx }) => {
                  const amount = tx.amountGhs;
                  // Money OUT of the float is the direction that costs, so it
                  // carries the red. The IN/OUT word under the figure is what
                  // actually distinguishes them: a printed statement is
                  // colourless and a leading "-" is easy to miss.
                  const isDebit = amount !== null && amount < 0;
                  return (
                    <tr key={tx.id} className="border-b border-adm-line">
                      <td className="py-1.5 align-top whitespace-nowrap">
                        {formatDateOnly(tx.occurredAt)}
                      </td>
                      <td className="py-1.5 align-top">
                        <span className="font-medium">
                          {TX_LABEL[tx.type] ?? tx.type}
                        </span>
                        {tx.reason ? (
                          <span className="text-adm-muted"> · {tx.reason}</span>
                        ) : null}
                      </td>
                      <td className="py-1.5 align-top">
                        <Figure
                          value={amount === null ? null : Math.abs(amount)}
                          className={cn(
                            "font-semibold",
                            amount !== null &&
                              (isDebit ? "text-console-red" : "text-console"),
                          )}
                        />
                        {amount !== null ? (
                          <span className="block text-right text-[10px] font-bold tracking-[0.1em] text-adm-faint uppercase">
                            {isDebit ? "Out" : "In"}
                          </span>
                        ) : null}
                      </td>
                      <td className="py-1.5 align-top">
                        <Figure value={runningAfter} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Never let a truncated ledger pass as the whole story. */}
        {(float.data.meta.total ?? 0) > rows.length ? (
          <p className="mt-3 text-[11.5px] text-adm-muted">
            Showing the {PAGE_LIMIT} most recent entries of{" "}
            {float.data.meta.total}. Narrow the period above to print the rest.
          </p>
        ) : null}

        {/* One ruled summary block instead of figures scattered down the page. */}
        <div className="mt-5 ml-auto w-full max-w-[340px]">
          {windowed ? (
            <>
              <div className="flex items-baseline justify-between gap-4 border-t border-adm-line py-1.5 text-[12.5px]">
                <span className="text-adm-muted">
                  Opening{from ? ` on ${formatDateOnly(from)}` : ""}
                </span>
                <Figure value={opening} />
              </div>
              {/* The rows' own movement: the closing figure minus what was
                  carried in, so it stays a period total even though the
                  balance column now starts from the opening balance. */}
              <div className="flex items-baseline justify-between gap-4 border-t border-adm-line py-1.5 text-[12.5px]">
                <span className="text-adm-muted">Net over period</span>
                <Figure
                  value={netOverPeriod}
                  className={cn(
                    netOverPeriod !== null &&
                      (netOverPeriod < 0
                        ? "text-console-red"
                        : netOverPeriod > 0
                          ? "text-console"
                          : ""),
                  )}
                />
              </div>
              <div className="flex items-baseline justify-between gap-4 border-t border-adm-line py-1.5 text-[12.5px]">
                <span className="text-adm-muted">
                  Closing on {to ? formatDateOnly(to) : "today"}
                </span>
                <Figure value={closing} />
              </div>
            </>
          ) : null}
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-adm-strong py-2 text-[12px] font-bold tracking-[0.08em] uppercase">
            <span>{windowed ? "Current float" : "Closing balance"}</span>
            <Figure value={balance} className="text-[16px] font-bold normal-case" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[12px]">
          <div className="border-t border-adm-strong pt-1">Agent&apos;s signature</div>
          <div className="border-t border-adm-strong pt-1">Owner&apos;s signature</div>
        </div>
      </div>
    </div>
  );
}
