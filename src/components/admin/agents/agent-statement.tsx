"use client";

import { useState } from "react";
import {
  AdminButton,
  AdminPageHeader,
  Mono,
} from "@/components/admin/ui";
import { ConsoleDateRange } from "@/components/admin/filter-bar";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { HelpWrap } from "@/components/admin/help-tip";
import { DocumentSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  AuthorisedSignature,
  DocumentLogo,
  InkSignatureLine,
} from "@/components/admin/document-marks";
import { extractApiError } from "@/lib/extract-api-error";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
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
 * A print-friendly agent float statement: every top-up, purchase, expense and
 * adjustment with a running balance, from live data. A4-styled via `print:`
 * utilities.
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
      // The API caps a page at 100. Asking for more fails validation, which
      // would leave the statement printing "No float activity yet" over a real
      // balance - the one thing a statement must never do.
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
      <DetailNav
        className="print:hidden"
        crumbs={[DASHBOARD_CRUMB, { label: "Agents", href: "/admin/agents" }]}
        current="Statement"
        backHref={`/admin/agents/${id}`}
        backLabel="Back to agent"
      />
      <AdminPageHeader
        className="print:hidden"
        title="Agent float statement"
        hint="Every movement in and out of this agent's money, in order."
        sub="Every top-up, purchase and expense against the cash this agent holds, ready to print and sign"
        actions={
          <>
            {/* The window belongs to the DOCUMENT, not to a list, so it is a
                page-level control beside the heading rather than a toolbar
                filter. */}
            <ConsoleDateRange
              from={from}
              to={to}
              onFromChange={setFrom}
              onToChange={setTo}
            />
            {windowed ? (
              <AdminButton
                variant="outline"
                onClick={() => {
                  setFrom("");
                  setTo("");
                }}
              >
                All history
              </AdminButton>
            ) : null}
            {/* The server renders this ledger as a paginated A4 PDF, window
                and all - printing happens from the viewer, which previews the
                sheet true to size instead of the browser dialog's guesswork. */}
            <AdminButton asChild>
              <a
                href={receiptPdfUrl("agent-statement", id, { from, to })}
                target="_blank"
                rel="noopener noreferrer"
              >
                View PDF
              </a>
            </AdminButton>
          </>
        }
      />

      {/* Left-aligned like every other console page - the sheet keeps its own
          720px measure so it still reads as a piece of paper. */}
      <div className="max-w-[720px] rounded-none border border-adm-line bg-white p-8 text-adm-ink">
        <div className="flex items-start justify-between gap-4 border-b-2 border-adm-strong pb-3">
          <div className="flex items-center gap-3">
            <DocumentLogo />
            <div>
              <div className="text-[20px] font-extrabold tracking-[0.12em] text-console">
                DB PLUS
              </div>
              <div className="text-[10.5px] tracking-[0.06em] text-adm-muted uppercase">
                Trading · Tamale
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-bold">FLOAT STATEMENT</div>
            <div className="text-[11px] text-adm-muted">
              {a.firstName} {a.lastName}
            </div>
            <div className="text-[11px] text-adm-muted">
              Printed {formatDate(new Date().toISOString())}
            </div>
            <div className="text-[11px] text-adm-muted">
              {windowed
                ? `Period ${from ? formatDateOnly(from) : "start"} to ${to ? formatDateOnly(to) : "today"}`
                : "All history"}
            </div>
          </div>
        </div>

        {/* Fixed money columns so every figure lands on the same right edge
            whatever the description beside it does. */}
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] table-fixed border-collapse text-[11.5px]">
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
                {/* HelpWrap, not HelpTip: this sheet is a facsimile of a
                    printed statement the agent signs, and a row of help icons
                    across its rule would stop it reading as one. */}
                <th className="py-2 text-right">
                  <HelpWrap text="Whether this line put money into the agent's hand or took it back out.">
                    In / out
                  </HelpWrap>
                </th>
                <th className="py-2 text-right">
                  <HelpWrap text="The running total left in the agent's hand after each line above it.">
                    Balance
                  </HelpWrap>
                </th>
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
                    <HelpWrap text="What the agent was already holding on the day this period starts.">
                      Balance brought forward
                    </HelpWrap>
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
          <p className="mt-3 text-[10.5px] text-adm-muted">
            Showing the {PAGE_LIMIT} most recent entries of{" "}
            {float.data.meta.total}. Narrow the period above to print the rest.
          </p>
        ) : null}

        {/* One ruled summary block instead of figures scattered down the page. */}
        <div className="mt-5 ml-auto w-full max-w-[340px]">
          {windowed ? (
            <>
              <div className="flex items-baseline justify-between gap-4 border-t border-adm-line py-1.5 text-[11px]">
                <span className="text-adm-muted">
                  Opening{from ? ` on ${formatDateOnly(from)}` : ""}
                </span>
                <Figure value={opening} />
              </div>
              {/* The rows' own movement: the closing figure minus what was
                  carried in, so it stays a period total even though the
                  balance column starts from the opening balance. */}
              <div className="flex items-baseline justify-between gap-4 border-t border-adm-line py-1.5 text-[11px]">
                <span className="text-adm-muted">
                  <HelpWrap text="Everything handed to the agent in these dates, less everything they spent or sent.">
                    Net over period
                  </HelpWrap>
                </span>
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
              <div className="flex items-baseline justify-between gap-4 border-t border-adm-line py-1.5 text-[11px]">
                <span className="text-adm-muted">
                  Closing on {to ? formatDateOnly(to) : "today"}
                </span>
                <Figure value={closing} />
              </div>
            </>
          ) : null}
          <div className="flex items-baseline justify-between gap-4 border-t-2 border-adm-strong py-2 text-[11px] font-bold tracking-[0.08em] uppercase">
            <span>
              <HelpWrap
                text={
                  windowed
                    ? "What the agent is holding today, including anything after the dates chosen above."
                    : "What the agent is holding today, after every line on this statement."
                }
              >
                {windowed ? "Current float" : "Closing balance"}
              </HelpWrap>
            </span>
            <Figure value={balance} className="text-[13px] font-bold normal-case" />
          </div>
        </div>

        {/* The counterparty signs in ink; the owner's saved signature is
            already on their line, same as the PDF. */}
        <div className="mt-12 flex flex-wrap items-end gap-x-8 gap-y-6 text-[11px]">
          <InkSignatureLine
            label="Agent's signature"
            className="flex-1 basis-[160px]"
          />
          <AuthorisedSignature className="flex-1 basis-[160px]" />
        </div>
      </div>
    </div>
  );
}
