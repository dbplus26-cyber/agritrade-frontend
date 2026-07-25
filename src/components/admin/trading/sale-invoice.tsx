"use client";

import Link from "next/link";
import { AdminButton } from "@/components/admin/ui";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import { useGetSaleQuery } from "@/redux/sales/admin-sales-api";
import { Money, formatSaleDate } from "./sale-bits";

/**
 * A print-friendly invoice / receipt for a sale (design doc ADR-004): live
 * data, A4-styled via `print:` utilities. The console chrome is hidden when
 * printing; only the document remains. A fully-paid sale reads as a receipt,
 * an outstanding one as an invoice.
 */
export function SaleInvoice({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetSaleQuery(id);

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.sale;
  const isReceipt = s.balanceGhs === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/sales/${s.id}`}
          className="text-[13px] text-console underline-offset-2 hover:underline"
        >
          ← Back to sale
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
            <div className="text-[16px] font-bold">
              {isReceipt ? "RECEIPT" : "INVOICE"}
            </div>
            <div className="text-[12px] text-soil">
              Ref {s.transactionNo}
            </div>
            <div className="text-[12px] text-soil">
              {formatSaleDate(s.confirmedAt ?? s.createdAt)}
            </div>
          </div>
        </div>

        <div className="mt-4 text-[13px]">
          <div className="mb-1 text-[10.5px] font-bold tracking-[0.08em] text-soil uppercase">
            Billed to
          </div>
          <div className="font-semibold">{s.buyer.name}</div>
          {s.buyer.phone ? <div>{s.buyer.phone}</div> : null}
        </div>

        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-ink text-left">
              <th className="py-2">Commodity</th>
              <th className="py-2 text-right">Weight</th>
              <th className="py-2 text-right">Price/kg</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr key={l.id} className="border-b border-soil/30">
                <td className="py-2">{l.commodity.name}</td>
                <td className="py-2 text-right">{formatKg(l.weightKg)}</td>
                <td className="py-2 text-right">
                  <Money value={l.unitPriceGhs} />
                </td>
                <td className="py-2 text-right">
                  <Money value={l.totalGhs} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 ml-auto w-full max-w-[280px] text-[13px]">
          <div className="flex justify-between py-1">
            <span className="text-soil">Agreed total</span>
            <span className="font-semibold">
              <Money value={s.agreedTotalGhs} />
            </span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-soil">Paid</span>
            <span>
              <Money value={s.paidGhs} />
            </span>
          </div>
          <div className="flex justify-between border-t border-ink py-1.5 text-[15px] font-bold">
            <span>{isReceipt ? "Settled" : "Balance due"}</span>
            <span>
              {isReceipt ? "Paid in full" : <Money value={s.balanceGhs} />}
            </span>
          </div>
        </div>

        {s.payments.length > 0 ? (
          <div className="mt-6 text-[12px]">
            <div className="mb-1 text-[10.5px] font-bold tracking-[0.08em] text-soil uppercase">
              Payments received
            </div>
            {s.payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between border-b border-soil/20 py-1"
              >
                <span>
                  {formatSaleDate(p.paidAt)} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <Money value={p.amountGhs} />
              </div>
            ))}
          </div>
        ) : null}

        <p className="mt-8 text-[11px] text-soil">
          Thank you for trading with DB Plus.
        </p>
      </div>
    </div>
  );
}
