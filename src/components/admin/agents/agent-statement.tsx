"use client";

import { useState } from "react";
import Link from "next/link";
import { AdminButton, Mono } from "@/components/admin/ui";
import { ConsoleDateField } from "@/components/admin/filter-bar";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly, formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  useGetAgentFloatQuery,
  useGetAgentQuery,
} from "@/redux/agents/agents-api";
import type { IFloatTransaction } from "@/types/agent.types";
import { Money } from "@/components/admin/trading/sale-bits";

const TX_LABEL: Record<string, string> = {
  ADJUSTMENT: "Adjustment",
  FIELD_EXPENSE: "Field expense",
  PURCHASE: "Purchase",
  TOP_UP: "Top-up",
};

const formatDate = (iso: string): string => formatDateTime(iso);

/**
 * A print-friendly agent float statement (design doc 5.2, ADR-004): every
 * top-up, purchase, expense and adjustment with a running balance, from live
 * data. A4-styled via `print:` utilities.
 */
export function AgentStatement({ id }: { id: string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const agent = useGetAgentQuery(id);
  const float = useGetAgentFloatQuery({
    agentUserId: id,
    params: {
      limit: 500,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });

  if (agent.isLoading || float.isLoading) return <DataTableSkeleton />;
  if (agent.isError || !agent.data)
    return (
      <ErrorMessage
        description={extractApiError(agent.error).message}
        onRetry={() => void agent.refetch()}
      />
    );

  const a = agent.data.data.agent;
  // The ledger arrives newest-first; a statement reads oldest-first with a
  // running balance, so reverse a copy and accumulate.
  const ledger = [...(float.data?.data ?? [])].reverse();
  // Running balance in a single pass: each row carries the previous row's
  // running total plus its own signed amount.
  const rows = ledger.reduce<{ runningAfter: number; tx: IFloatTransaction }[]>(
    (acc, tx) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].runningAfter : 0;
      acc.push({ runningAfter: prev + (tx.amountGhs ?? 0), tx });
      return acc;
    },
    [],
  );
  const balance = float.data?.summary.balanceGhs ?? a.balanceGhs;
  const windowed = Boolean(from || to);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2.5 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/admin/agents/${id}`}
            className="text-[13px] text-console underline-offset-2 hover:underline"
          >
            ← Back to agent
          </Link>
          <AdminButton className="h-9 px-4" onClick={() => window.print()}>
            Print
          </AdminButton>
        </div>
        <div className="flex flex-col gap-2 min-[480px]:flex-row">
          <ConsoleDateField
            label="From"
            value={from}
            onChange={setFrom}
            max={to || undefined}
          />
          <ConsoleDateField
            label="To"
            value={to}
            onChange={setTo}
            min={from || undefined}
          />
        </div>
      </div>

      <div className="mx-auto max-w-[720px] rounded-[8px] border border-soil/25 bg-white p-8 text-ink print:max-w-none print:rounded-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-ink pb-3">
          <div>
            <div className="text-[20px] font-extrabold tracking-[0.12em] text-console">
              DB PLUS
            </div>
            <div className="text-[11px] tracking-[0.06em] text-soil uppercase">
              Agro Trading · Tamale
            </div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-bold">FLOAT STATEMENT</div>
            <div className="text-[12px] text-soil">
              {a.firstName} {a.lastName}
            </div>
            <div className="text-[12px] text-soil">
              Printed {formatDate(new Date().toISOString())}
            </div>
            {windowed ? (
              <div className="text-[12px] text-soil">
                Period {from ? formatDateOnly(from) : "start"} to{" "}
                {to ? formatDateOnly(to) : "today"}
              </div>
            ) : null}
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-ink text-left">
              <th className="py-2">Date</th>
              <th className="py-2">Type</th>
              <th className="py-2 text-right">Amount</th>
              {/* Within a date window the running column starts at zero, so it
                  reads as the period's running total, not the true balance. */}
              <th className="py-2 text-right">{windowed ? "Running" : "Balance"}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-soil">
                  No float activity yet.
                </td>
              </tr>
            ) : (
              rows.map(({ runningAfter, tx }) => (
                <tr key={tx.id} className="border-b border-soil/25">
                  <td className="py-1.5">{formatDate(tx.occurredAt)}</td>
                  <td className="py-1.5">
                    {TX_LABEL[tx.type] ?? tx.type}
                    {tx.reason ? (
                      <span className="text-soil"> · {tx.reason}</span>
                    ) : null}
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-right",
                      (tx.amountGhs ?? 0) < 0 ? "text-console-red" : "text-leaf",
                    )}
                  >
                    <Money value={tx.amountGhs} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Mono>{runningAfter.toFixed(2)}</Mono>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-[280px]">
          {windowed ? (
            <div className="flex justify-between border-t border-soil/40 py-1 text-[13px]">
              <span>Net over period</span>
              <Mono>
                {(rows.length > 0
                  ? rows[rows.length - 1].runningAfter
                  : 0
                ).toFixed(2)}
              </Mono>
            </div>
          ) : null}
          <div className="flex justify-between border-t border-ink py-1.5 text-[15px] font-bold">
            <span>{windowed ? "Current balance" : "Closing balance"}</span>
            <Money value={balance} />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[12px]">
          <div className="border-t border-ink pt-1">Agent&apos;s signature</div>
          <div className="border-t border-ink pt-1">Owner&apos;s signature</div>
        </div>
      </div>
    </div>
  );
}
