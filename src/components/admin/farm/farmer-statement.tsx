"use client";

import { useState } from "react";
import Link from "next/link";
import { ConsoleDateRange } from "@/components/admin/filter-bar";
import { AdminButton, AdminPageHeader, Mono } from "@/components/admin/ui";
import { Money } from "@/components/admin/trading/sale-bits";
import { DocumentSkeleton } from "@/components/admin/skeletons";
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

  if (isLoading) return <DocumentSkeleton />;
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
      <div className="print:hidden">
        <Link
          href={`/admin/farmers/${id}`}
          className="mb-2 inline-block text-[13px] text-console underline-offset-2 hover:underline"
        >
          ← Back to farmer
        </Link>
        <AdminPageHeader
          title={`${st.farmer.name} - statement`}
          sub="Every grant and repayment with a running balance, ready to print and sign"
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
        {/* The window is part of the DOCUMENT, not a list filter, so it sits
            with the sheet rather than in a toolbar above the heading. */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <ConsoleDateRange
            from={from}
            to={to}
            onFromChange={setFrom}
            onToChange={setTo}
          />
          {from || to ? (
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
      <div className="max-w-[720px] border border-adm-line bg-white p-8 text-adm-ink print:max-w-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-adm-strong pb-3">
          <div>
            <div className="text-[20px] font-extrabold tracking-[0.12em] text-console">
              DB PLUS
            </div>
            <div className="text-[11px] tracking-[0.06em] text-adm-muted uppercase">
              Trading · Tamale
            </div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-bold">FARMER STATEMENT</div>
            <div className="text-[12px] text-adm-muted">{st.farmer.name}</div>
            <div className="text-[12px] text-adm-muted">
              Printed {formatFarmDate(new Date().toISOString())}
            </div>
            {/* The period is part of the document: a statement someone keeps
                has to say what it covers, or it cannot be reconciled later. */}
            <div className="text-[12px] text-adm-muted">
              {st.window.from || st.window.to
                ? `Period ${st.window.from ? formatFarmDate(st.window.from) : "start"} to ${st.window.to ? formatFarmDate(st.window.to) : "date"}`
                : "All history"}
            </div>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-adm-strong text-left">
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
              <tr className="border-b border-adm-line">
                <td className="py-1.5 text-adm-muted">
                  {formatFarmDate(st.window.from)}
                </td>
                <td className="py-1.5 text-adm-muted">Balance brought forward</td>
                <td className="py-1.5 text-right text-adm-muted">-</td>
                <td className="py-1.5 text-right">
                  <Mono>
                    <Money value={st.openingBalanceGhs} />
                  </Mono>
                </td>
              </tr>
            ) : null}
            {st.rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-3 text-adm-muted">
                  {st.window.from || st.window.to
                    ? "Nothing moved in this period."
                    : "No grants or repayments yet."}
                </td>
              </tr>
            ) : (
              st.rows.map((r, i) => (
                <tr key={i} className="border-b border-adm-line">
                  <td className="py-1.5">{formatFarmDate(r.at)}</td>
                  <td className="py-1.5">
                    {r.detail}
                    <span className="text-adm-muted"> · {r.season}</span>
                  </td>
                  <td
                    className={cn(
                      "py-1.5 text-right",
                      r.kind === "repayment" ? "text-console" : "text-console-red",
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

        <div className="mt-4 ml-auto flex w-full max-w-[280px] justify-between border-t border-adm-strong py-1.5 text-[15px] font-bold">
          <span>Outstanding balance</span>
          <Money value={st.balanceGhs} />
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[12px]">
          <div className="border-t border-adm-strong pt-1">Farmer&apos;s signature</div>
          <div className="border-t border-adm-strong pt-1">Owner&apos;s signature</div>
        </div>
      </div>
    </div>
  );
}
