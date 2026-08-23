"use client";

import { useState } from "react";
import { ConsoleDateRange } from "@/components/admin/filter-bar";
import { AdminButton, AdminPageHeader, Mono } from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { Money } from "@/components/admin/trading/sale-bits";
import { DocumentSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  AuthorisedSignature,
  DocumentLogo,
  InkSignatureLine,
} from "@/components/admin/document-marks";
import { extractApiError } from "@/lib/extract-api-error";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { cn } from "@/lib/utils";
import { useGetFarmerStatementQuery } from "@/redux/farm/farm-books-api";
import { formatFarmDate } from "./farm-bits";

/**
 * A print-friendly farmer statement: every grant
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
  // Empty means "all history". A window narrows the statement to a period the
  // office is actually reconciling.
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
        <DetailNav
          className="print:hidden"
          crumbs={[
            DASHBOARD_CRUMB,
            { label: "Farmers", href: "/admin/farmers" },
            { label: st.farmer.name, href: `/admin/farmers/${id}` },
          ]}
          current="Statement"
          backLabel="Farmer"
        />
        <AdminPageHeader
          title="Farmer statement"
          hint="Everything advanced to this farmer and everything repaid, in order."
          sub="Every grant and repayment with a running balance, ready to print and sign"
          actions={
            <>
              {/* The window belongs to the DOCUMENT, not to a list, so it is
                  a page-level control beside the heading rather than a
                  toolbar filter. */}
              <ConsoleDateRange
                from={from}
                to={to}
                onFromChange={setFrom}
                onToChange={setTo}
              />
              {from || to ? (
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
                  and all - printing happens from the viewer, which previews
                  the sheet true to size instead of the browser dialog's
                  guesswork. */}
              <AdminButton asChild>
                <a
                  href={receiptPdfUrl("farmer-statement", id, {
                    from,
                    seasonId,
                    to,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View PDF
                </a>
              </AdminButton>
            </>
          }
        />
      </div>

      {/* Left-aligned like every other console page - the sheet keeps its own
          720px measure so it still reads as a piece of paper. */}
      <div className="max-w-[720px] border border-adm-line bg-white p-8 text-adm-ink">
        <div className="flex items-start justify-between border-b-2 border-adm-strong pb-3">
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
            <div className="text-[13px] font-bold">FARMER STATEMENT</div>
            <div className="text-[11px] text-adm-muted">{st.farmer.name}</div>
            <div className="text-[11px] text-adm-muted">
              Printed {formatFarmDate(new Date().toISOString())}
            </div>
            {/* The period is part of the document: a statement someone keeps
                has to say what it covers, or it cannot be reconciled later. */}
            <div className="text-[11px] text-adm-muted">
              {st.window.from || st.window.to
                ? `Period ${st.window.from ? formatFarmDate(st.window.from) : "start"} to ${st.window.to ? formatFarmDate(st.window.to) : "date"}`
                : "All history"}
            </div>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[11.5px]">
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

        <div className="mt-4 ml-auto flex w-full max-w-[280px] justify-between border-t border-adm-strong py-1.5 text-[12.5px] font-bold">
          <span>Outstanding balance</span>
          <Money value={st.balanceGhs} />
        </div>

        {/* The counterparty signs in ink; the owner's saved signature is
            already on their line, same as the PDF. */}
        <div className="mt-12 flex flex-wrap items-end gap-x-8 gap-y-6 text-[11px]">
          <InkSignatureLine
            label="Farmer's signature"
            className="flex-1 basis-[160px]"
          />
          <AuthorisedSignature className="flex-1 basis-[160px]" />
        </div>
      </div>
    </div>
  );
}
