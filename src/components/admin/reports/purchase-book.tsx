"use client";

import { useState } from "react";
import Link from "next/link";
import {
  WidgetEmpty,
  WidgetError,
} from "@/components/admin/dashboard/chart-kit";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  AdminButton,
  AdminPageHeader,
  adminSelectClass,
} from "@/components/admin/ui";
import { SimpleSelect } from "@/components/ui/simple-select";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import { cn } from "@/lib/utils";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetPurchaseBookQuery } from "@/redux/reports/reports-api";
import type { IPurchaseBook, IPurchaseBookRow } from "@/types/report.types";

const EXPORT = `${env.SERVER_URI}/api/v1/admin/reports/exports/purchase-book.xlsx`;

/**
 * The sheet's own colours. This screen is the owner's Excel purchase book on
 * a page, so it keeps the workbook's palette (and its dark-on-light cells in
 * either theme) rather than the console's.
 */
const SHEET = {
  title: "bg-[#e2efda] text-[#2e7d32]",
  totals: "bg-[#1e5c2b] text-white",
  head: "bg-[#2ea64f] text-white",
  diff: "bg-[#4f81bd] text-white",
  blank: "bg-[#dce6f1]",
  cell: "border border-[#a6a6a6] bg-white text-[#161c24]",
  red: "text-[#e00000]",
};

const int = (v: number | null) =>
  v === null ? "" : v.toLocaleString("en-GH", { maximumFractionDigits: 2 });
const dec = (v: number | null) => (v === null ? "" : v.toFixed(2));
/** Accounting style, as the sheet prints it: (1,234.00) below zero, - for nil. */
const amount = (v: number | null) => {
  if (v === null) return "";
  if (v === 0) return "-";
  const text = Math.abs(v).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return v < 0 ? `(${text})` : text;
};
const sheetDate = (iso: string) =>
  new Date(iso)
    .toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    .replaceAll(" ", "-");

/** "SOYA ... (PUR-2026-" + red "00042" + ")", linked to the purchase. */
function Particulars({ row }: { row: IPurchaseBookRow }) {
  if (!row.reference || !row.purchaseId) return <>{row.particulars}</>;
  const cut = row.reference.lastIndexOf("-") + 1;
  return (
    <>
      {row.particulars}{" "}
      <Link
        className="whitespace-nowrap underline-offset-2 hover:underline"
        href={`/admin/purchases/${row.purchaseId}`}
      >
        ({row.reference.slice(0, cut)}
        <span className={cn("font-bold", SHEET.red)}>
          {row.reference.slice(cut)}
        </span>
        )
      </Link>
    </>
  );
}

const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

export function PurchaseBook() {
  const commodities = useGetCommoditiesQuery({ limit: 100 });
  const [picked, setPicked] = useState("");
  const [year, setYear] = useState(YEARS[0]);
  // Until one is chosen the book opens on the first commodity in the register.
  const commodityId = picked || commodities.data?.data[0]?.id || "";
  const book = useGetPurchaseBookQuery(
    { commodityId, year },
    { skip: !commodityId },
  );
  const data = book.data?.data;
  // The sheet is shown whole at every width, scrolling sideways on a phone:
  // the book is the owner's Excel workbook, and it reads as one.
  return (
    <div>
      <AdminPageHeader
        title="Purchase book"
        hint="One commodity's year in one place: what was bought, what was paid, and what has left on a truck. Nothing is typed in here; it is built from your purchases, payments and shipments."
        sub="Every purchase of a commodity, the cash paid for it and what has been dispatched"
        actions={
          <>
            <SearchableSelect
              className="w-[200px]"
              value={commodityId}
              onChange={setPicked}
              options={(commodities.data?.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="Choose a commodity"
              loading={commodities.isFetching}
            />
            <SimpleSelect
              className={cn(adminSelectClass, "w-[96px]")}
              value={String(year)}
              onChange={(v) => setYear(Number(v))}
              placeholder="Year"
              options={YEARS.map((y) => ({
                value: String(y),
                label: String(y),
              }))}
            />
            {commodityId ? (
              <AdminButton variant="outline" asChild>
                <a href={`${EXPORT}${toQueryString({ commodityId, year })}`}>
                  Export Excel
                </a>
              </AdminButton>
            ) : null}
          </>
        }
      />

      {commodities.isLoading || book.isLoading ? (
        <Skeleton className="h-[320px] w-full rounded-none" />
      ) : book.isError || commodities.isError ? (
        <WidgetError
          onRetry={() => {
            void commodities.refetch();
            if (commodityId) void book.refetch();
          }}
          what="the purchase book"
        />
      ) : !data ? (
        <WidgetEmpty
          title="No commodities yet"
          hint="Add a commodity and record a purchase, and its book appears here."
        />
      ) : data.rows.length === 0 ? (
        <WidgetEmpty
          title={`No ${data.commodity.name} purchases in ${String(data.year)}`}
          hint="Purchases recorded for this commodity and year show up here on their own."
        />
      ) : (
        <div className={cn(book.isFetching && "opacity-60")}>
          {data.totals.payableGhs === null ? (
            <p className="mb-3 text-[12px] text-adm-muted">
              Money figures are hidden for your account. Weights, bags and
              dispatch are shown in full.
            </p>
          ) : null}
          <BookTable book={data} />
        </div>
      )}
    </div>
  );
}

const title = (book: IPurchaseBook) =>
  `DB+_${book.commodity.name.toUpperCase()} PURCHASE BOOK-${String(book.year)}`;

/** The sheet itself, scrolling sideways inside its own frame when narrow. */
function BookTable({ book }: { book: IPurchaseBook }) {
  const t = book.totals;
  const th = cn("px-1.5 py-1.5 font-serif text-[10.5px] font-bold", SHEET.head);
  const total = cn("px-1.5 py-1.5 text-center font-bold", SHEET.totals);
  const td = cn("px-1.5 py-1 text-center", SHEET.cell);
  return (
    <div>
      {/* Outside the scrolling frame, so the title stays put on a phone while
          the sheet moves under it. */}
      <p
        aria-hidden="true"
        className={cn(
          "px-3 py-2 text-center font-serif text-[15px] font-bold underline @min-[760px]/main:text-[22px]",
          SHEET.title,
        )}
      >
        {title(book)}
      </p>
      <div
        aria-label="Purchase book, scrolls sideways"
        className="overflow-x-auto overscroll-x-contain"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-[1120px] border-collapse font-adminmono text-[11.5px] tabular-nums">
          <caption className="sr-only">{title(book)}</caption>
          <thead>
            <tr aria-label="Totals">
              <td className={SHEET.blank} colSpan={2} />
              <td className={total}>{int(t.bags)}</td>
              <td className={total}>{dec(t.avgPriceGhs)}</td>
              <td className={total}>{int(t.weightKg)}</td>
              <td className={total}>{amount(t.payableGhs)}</td>
              <td className={total}>{int(t.advanceGhs)}</td>
              <td className={total}>{amount(t.balanceCashGhs)}</td>
              <td className={SHEET.blank} />
              <td className={total}>{int(t.dispatchedBags)}</td>
              <td className={total}>{int(t.dispatchedKg)}</td>
              <td className={total}>{int(t.balanceBags)}</td>
              <td className={total}>{int(t.balanceKg)}</td>
              <td className={SHEET.blank} />
              <td className={cn("px-2 text-center font-bold", SHEET.blank)}>
                {int(t.fmDeductionKg)}
              </td>
            </tr>
            <tr>
              <td className={SHEET.blank} colSpan={2} />
              <th className={th} colSpan={5} scope="colgroup">
                PURCHASE DETAILS
              </th>
              <td className={SHEET.blank} />
              <th className={th} scope="colgroup">
                QLTY
              </th>
              <th className={th} colSpan={4} scope="colgroup">
                DISPATCH DETAILS
              </th>
              <th
                className={cn(
                  "px-2 font-serif text-[13px] font-bold",
                  SHEET.diff,
                )}
                colSpan={2}
                rowSpan={2}
                scope="colgroup"
                title="Weight taken off for foreign matter above the tolerance: the percentage, then the kilos"
              >
                Wt. Difference
              </th>
            </tr>
            <tr>
              {[
                "DATE",
                "PARTICULARS",
                "BAGS",
                "PRICE",
                "KG",
                "PAYABLE AMOUNT",
                "ADVANCE",
                "BALANCE CASH",
                "FM%",
                "BAGS",
                "KGS",
                "BALANCE BAGS",
                "BALANCE IN KG",
              ].map((label, i) => (
                <th className={th} key={`${label}-${String(i)}`} scope="col">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {book.rows.map((row, i) => {
              const cash = row.kind === "CASH";
              const na = cash ? cn(td, SHEET.blank) : td;
              return (
                <tr
                  key={`${row.kind}-${row.purchaseId ?? row.date}-${String(i)}`}
                >
                  <td className={cn(td, "whitespace-nowrap")}>
                    {sheetDate(row.date)}
                  </td>
                  <td className={cn(td, "text-left font-sans")}>
                    <Particulars row={row} />
                  </td>
                  <td className={na}>{int(row.bags)}</td>
                  <td className={na}>{dec(row.priceGhs)}</td>
                  <td className={na}>{int(row.weightKg)}</td>
                  <td className={cn(td, "text-right")}>
                    {amount(row.payableGhs ?? (cash ? 0 : null))}
                  </td>
                  <td className={cn(td, "text-right")}>
                    {int(row.advanceGhs)}
                  </td>
                  <td
                    className={cn(
                      td,
                      "text-right",
                      (row.balanceCashGhs ?? 0) < 0 &&
                        cn("font-bold", SHEET.red),
                    )}
                  >
                    {amount(row.balanceCashGhs)}
                  </td>
                  <td className={cn(na, "font-bold", SHEET.red)}>
                    {dec(row.fmPercent)}
                  </td>
                  <td className={na}>{int(row.dispatchedBags)}</td>
                  <td className={na}>{int(row.dispatchedKg)}</td>
                  <td className={td}>{int(row.balanceBags ?? 0)}</td>
                  <td className={td}>{int(row.balanceKg ?? 0)}</td>
                  <td className={cn(td, SHEET.blank)}>
                    {row.fmDeductionPct ? dec(row.fmDeductionPct) : ""}
                  </td>
                  <td className={cn(td, "text-right", SHEET.blank)}>
                    {amount(row.fmDeductionKg ?? 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
