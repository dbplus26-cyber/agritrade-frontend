"use client";

import { useState } from "react";
import Link from "next/link";
import { ConsoleDateField } from "@/components/admin/filter-bar";
import { AdminButton, Mono } from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { cn } from "@/lib/utils";
import { useGetFarmerStatementQuery } from "@/redux/farm/farm-books-api";
import { formatFarmDate } from "./farm-bits";

/**
 * A print-friendly farmer statement (design doc 5.11, ADR-004): every grant
 * (+value owed) and repayment (-value) with a running balance, from live data.
 * A4-styled via `print:` utilities. Optionally scoped to one season.
 */
export function FarmerStatement({
  id,
  seasonId,
}: {
  id: string;
  seasonId?: string;
}) {
  // Empty means "all history", which is what the statement used to be able to
  // print and nothing else. A window narrows it to a period the office is
  // actually reconciling.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isError, error, refetch } =
    useGetFarmerStatementQuery({
      farmerId: id,
      seasonId,
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    });

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const st = data.data.statement;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/farmers/${id}`}
          className="text-[13px] text-console underline-offset-2 hover:underline"
        >
          ← Back to farmer
        </Link>
        <div className="flex flex-wrap items-end gap-2">
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
          {from || to ? (
            <AdminButton
              variant="outline"
              className="h-9 px-3"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              All history
            </AdminButton>
          ) : null}
          <AdminButton className="h-9 px-4" onClick={() => window.print()}>
            Print
          </AdminButton>
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
            <div className="text-[16px] font-bold">FARMER STATEMENT</div>
            <div className="text-[12px] text-soil">{st.farmer.name}</div>
            <div className="text-[12px] text-soil">
              Printed {formatFarmDate(new Date().toISOString())}
            </div>
            {/* The period is part of the document: a statement someone keeps
                has to say what it covers, or it cannot be reconciled later. */}
            <div className="text-[12px] text-soil">
              {st.window.from || st.window.to
                ? `Period ${st.window.from ? formatFarmDate(st.window.from) : "start"} to ${st.window.to ? formatFarmDate(st.window.to) : "date"}`
                : "All history"}
            </div>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-ink text-left">
              <th className="py-2">Date</th>
              <th className="py-2">Detail</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {/* Everything before the window, carried in. Without it the running
                balance below would start from zero and be wrong. */}
            {st.window.from ? (
              <tr className="border-b border-soil/25">
                <td className="py-1.5 text-soil">
                  {formatFarmDate(st.window.from)}
                </td>
                <td className="py-1.5 text-soil">Balance brought forward</td>
                <td className="py-1.5 text-right text-soil">-</td>
                <td className="py-1.5 text-right">
                  <Mono>
                    <Money value={st.openingBalanceGhs} />
                  </Mono>
                </td>
              </tr>
            ) : null}
            {st.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-soil">
                  {st.window.from || st.window.to
                    ? "Nothing moved in this period."
                    : "No grants or repayments yet."}
                </td>
              </tr>
            ) : (
              st.rows.map((r, i) => (
                <tr key={i} className="border-b border-soil/25">
                  <td className="py-1.5">{formatFarmDate(r.at)}</td>
                  <td className="py-1.5">
                    {r.detail}
                    <span className="text-soil"> · {r.season}</span>
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-right",
                      r.kind === "repayment" ? "text-leaf" : "text-console-red",
                    )}
                  >
                    <Money value={r.deltaGhs} />
                  </td>
                  <td className="py-1.5 text-right">
                    <Mono>
                      <Money value={r.balanceAfterGhs} />
                    </Mono>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="mt-4 ml-auto flex w-full max-w-[280px] justify-between border-t border-ink py-1.5 text-[15px] font-bold">
          <span>Outstanding balance</span>
          <Money value={st.balanceGhs} />
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[12px]">
          <div className="border-t border-ink pt-1">Farmer&apos;s signature</div>
          <div className="border-t border-ink pt-1">Owner&apos;s signature</div>
        </div>
      </div>
    </div>
  );
}
