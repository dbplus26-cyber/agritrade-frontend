"use client";

import Link from "next/link";
import { AdminButton, Mono } from "@/components/admin/ui";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateTime } from "@/lib/format-date";
import { cn } from "@/lib/utils";
import {
  useGetAgentFloatQuery,
  useGetAgentQuery,
} from "@/redux/agents/agents-api";
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
  const agent = useGetAgentQuery(id);
  const float = useGetAgentFloatQuery({
    agentUserId: id,
    params: { limit: 500 },
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
  // Running balance as a prefix sum (no mutation - keeps the React Compiler
  // happy). The ledger is small (capped at 500), so O(n²) is negligible.
  const rows = ledger.map((tx, i) => ({
    runningAfter: ledger
      .slice(0, i + 1)
      .reduce((sum, t) => sum + (t.amountGhs ?? 0), 0),
    tx,
  }));
  const balance = float.data?.summary.balanceGhs ?? a.balanceGhs;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
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
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-ink text-left">
              <th className="py-2">Date</th>
              <th className="py-2">Type</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 text-right">Balance</th>
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

        <div className="mt-4 ml-auto flex w-full max-w-[280px] justify-between border-t border-ink py-1.5 text-[15px] font-bold">
          <span>Closing balance</span>
          <Money value={balance} />
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[12px]">
          <div className="border-t border-ink pt-1">Agent&apos;s signature</div>
          <div className="border-t border-ink pt-1">Owner&apos;s signature</div>
        </div>
      </div>
    </div>
  );
}
