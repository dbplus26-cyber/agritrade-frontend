"use client";

import Link from "next/link";
import { AdminButton } from "@/components/admin/ui";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatKg } from "@/lib/format-money";
import {
  shipmentWaybillPdfUrl,
  useGetShipmentQuery,
} from "@/redux/shipments/shipments-api";
import { formatShipmentDate } from "./shipment-bits";

/**
 * A print-friendly loading sheet / waybill (design doc ADR-004): live data,
 * A4-styled via `print:` utilities so the office can print-to-PDF. The console
 * chrome is hidden when printing; only this sheet remains.
 */
export function Waybill({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetShipmentQuery(id);

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.shipment;

  return (
    <div>
      {/* Toolbar (never printed) */}
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href={`/admin/shipments/${s.id}`}
          className="text-[13px] text-console underline-offset-2 hover:underline"
        >
          ← Back to shipment
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton variant="outline" className="h-9 px-4" asChild>
            <a
              href={shipmentWaybillPdfUrl(s.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Download PDF
            </a>
          </AdminButton>
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
            <div className="text-[16px] font-bold">WAYBILL</div>
            <div className="text-[12px] text-soil">Ref {s.transactionNo}</div>
            <div className="max-w-[260px] text-[12px] text-soil [overflow-wrap:anywhere]">
              Sales: {s.sales.map((sale) => sale.transactionNo).join(", ")}
            </div>
            <div className="text-[12px] text-soil">
              {s.departedAt
                ? formatShipmentDate(s.departedAt)
                : formatShipmentDate(s.createdAt)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-[13px]">
          <div>
            <div className="mb-1 text-[10.5px] font-bold tracking-[0.08em] text-soil uppercase">
              {s.sales.length === 1 ? "Buyer" : "Buyers"}
            </div>
            {s.sales.length === 1 ? (
              <>
                <div className="font-semibold">
                  {s.sales[0]?.buyer.name ?? ""}
                </div>
                {s.sales[0]?.buyer.phone ? (
                  <div>{s.sales[0].buyer.phone}</div>
                ) : null}
              </>
            ) : (
              <div className="font-semibold [overflow-wrap:anywhere]">
                {s.sales.map((sale) => sale.buyer.name).join(", ")}
              </div>
            )}
            <div className="mt-1">Destination: {s.destination}</div>
          </div>
          <div>
            <div className="mb-1 text-[10.5px] font-bold tracking-[0.08em] text-soil uppercase">
              Transport
            </div>
            <div>From: {s.originWarehouse.name}</div>
            <div>Truck: {s.truckReg}</div>
            <div>
              Driver: {s.driverName}
              {s.driverPhone ? ` (${s.driverPhone})` : ""}
            </div>
          </div>
        </div>

        <table className="mt-6 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-y border-ink text-left">
              <th className="py-2">Commodity</th>
              <th className="py-2 text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {s.manifest.map((m) => (
              <tr key={m.commodity} className="border-b border-soil/30">
                <td className="py-2">{m.commodity}</td>
                <td className="py-2 text-right">{formatKg(m.weightKg)}</td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="py-2">Total</td>
              <td className="py-2 text-right">{formatKg(s.totalWeightKg)}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-2 gap-8 text-[12px]">
          <div className="border-t border-ink pt-1">
            Driver&apos;s signature
          </div>
          <div className="border-t border-ink pt-1">
            Receiver&apos;s signature
          </div>
        </div>
      </div>
    </div>
  );
}
