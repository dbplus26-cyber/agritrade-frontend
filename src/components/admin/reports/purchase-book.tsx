"use client";

import { useState } from "react";
import Link from "next/link";
import {
  WidgetEmpty,
  WidgetError,
} from "@/components/admin/dashboard/chart-kit";
import { ConsoleTabs } from "@/components/admin/console-tabs";
import { ExportLink } from "@/components/admin/export-link";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  AdminButton,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { env } from "@/lib/env";
import { toQueryString } from "@/lib/to-query-string";
import { cn } from "@/lib/utils";
import { useGetBuyersQuery } from "@/redux/buyers/buyers-api";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import {
  useGetPurchaseBookQuery,
  useGetSalesBookQuery,
} from "@/redux/reports/reports-api";
import { useGetSuppliersQuery } from "@/redux/suppliers/suppliers-api";
import type { IPurchaseBook, IPurchaseBookRow } from "@/types/report.types";

type Side = IPurchaseBook["side"];

/** Everyone on that side of the book, rather than one supplier or buyer. */
const ALL = "ALL";

/** The words that differ between the buying and the selling side. */
const WORDS = {
  PURCHASE: {
    all: "All suppliers",
    book: "PURCHASE BOOK",
    choose: "Choose a supplier",
    details: "PURCHASE DETAILS",
    exportPath: "purchase-book.xlsx",
    href: "/admin/purchases",
    paid: "ADVANCE",
    payable: "PAYABLE AMOUNT",
    people: "suppliers",
    title: "Purchase book",
    verb: "purchases",
  },
  SALE: {
    all: "All buyers",
    book: "SALES BOOK",
    choose: "Choose a buyer",
    details: "SALES DETAILS",
    exportPath: "sales-book.xlsx",
    href: "/admin/sales",
    paid: "RECEIVED",
    payable: "RECEIVABLE AMOUNT",
    people: "buyers",
    title: "Sales book",
    verb: "sales",
  },
} as const;

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

/** "SOYA ... (PUR-2026-" + red "00042" + ")", linked to the document. */
function Particulars({ row, side }: { row: IPurchaseBookRow; side: Side }) {
  if (!row.reference || !row.documentId) return <>{row.particulars}</>;
  const cut = row.reference.lastIndexOf("-") + 1;
  return (
    <>
      {row.particulars}{" "}
      <Link
        className="whitespace-nowrap underline-offset-2 hover:underline"
        href={`${WORDS[side].href}/${row.documentId}`}
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

/** The years the API takes; any of them can be typed, past or to come. */
const validYear = (text: string) =>
  /^\d{4}$/.test(text) && Number(text) >= 2000 && Number(text) <= 2100;

export function PurchaseBook() {
  const [side, setSide] = useState<Side>("PURCHASE");
  // The supplier or buyer whose book is open: none yet, ALL, or one record.
  const [party, setParty] = useState({ id: "", name: "" });
  const [picked, setPicked] = useState({ id: "", name: "" });
  // What is typed in the year box, and the last full year it held: the book
  // follows the box only once it reads as a year.
  const [yearText, setYearText] = useState(String(new Date().getFullYear()));
  const [year, setYear] = useState(new Date().getFullYear());
  // The book comes a page at a time; any change of book starts at its top.
  const [page, setPage] = useState(1);
  const words = WORDS[side];
  const buying = side === "PURCHASE";

  // Every register here grows without limit, so each picker asks the server
  // for what is typed rather than filtering a page it happens to hold.
  const commoditySearch = useRemoteSearch();
  const firstCommodities = useGetCommoditiesQuery({ limit: 20 });
  const commodities = useGetCommoditiesQuery({
    limit: 20,
    search: commoditySearch.query,
  });
  // Until one is chosen the book opens on the first commodity in the register.
  const first = firstCommodities.data?.data[0];
  const commodity = picked.id
    ? picked
    : { id: first?.id ?? "", name: first?.name ?? "" };
  const commodityId = commodity.id;
  const partyId = party.id === ALL ? undefined : party.id;
  const ready = Boolean(commodityId && party.id);

  const search = useRemoteSearch();
  const suppliers = useGetSuppliersQuery(
    { limit: 20, search: search.query },
    { skip: !buying },
  );
  const buyers = useGetBuyersQuery(
    { limit: 20, search: search.query },
    { skip: buying },
  );
  const people = buying ? suppliers : buyers;

  const purchaseBook = useGetPurchaseBookQuery(
    { commodityId, page, supplierId: partyId, year },
    { skip: !ready || !buying },
  );
  const salesBook = useGetSalesBookQuery(
    { buyerId: partyId, commodityId, page, year },
    { skip: !ready || buying },
  );
  const book = buying ? purchaseBook : salesBook;
  const data = book.data?.data;
  const meta = book.data?.meta;
  // The sheet is shown whole at every width, scrolling sideways on a phone:
  // the book is the owner's Excel workbook, and it reads as one.
  return (
    <div>
      <AdminPageHeader
        title={words.title}
        hint="One supplier's or buyer's year in a commodity: what was bought or sold, what was paid, and what has left on a truck. Nothing is typed in here; it is built from your purchases, sales, payments and shipments."
        sub={`Every ${words.verb.slice(0, -1)} of a commodity with one of your ${words.people}, the cash paid and what has been dispatched`}
        actions={
          <>
            <ConsoleTabs
              label="Which side of the book"
              tabs={[
                { value: "PURCHASE", label: "Suppliers" },
                { value: "SALE", label: "Buyers" },
              ]}
              value={side}
              onChange={(next) => {
                setSide(next);
                // A supplier is not a buyer: the other side starts unchosen.
                setParty({ id: "", name: "" });
                setPage(1);
              }}
            />
            <SearchableSelect
              className="w-[200px]"
              value={party.id}
              onChange={(id) => {
                const name =
                  people.data?.data.find((p) => p.id === id)?.name ?? "";
                setParty({ id, name });
                setPage(1);
              }}
              options={[
                { value: ALL, label: words.all },
                ...(people.data?.data ?? []).map((p) => ({
                  value: p.id,
                  label: p.name,
                })),
              ]}
              placeholder={words.choose}
              onSearchChange={search.onSearchChange}
              loading={people.isFetching}
              selectedLabel={party.name}
            />
            <SearchableSelect
              className="w-[200px]"
              value={commodityId}
              onChange={(id) => {
                const name =
                  commodities.data?.data.find((c) => c.id === id)?.name ?? "";
                setPicked({ id, name });
                setPage(1);
              }}
              options={(commodities.data?.data ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              placeholder="Choose a commodity"
              onSearchChange={commoditySearch.onSearchChange}
              loading={commodities.isFetching}
              selectedLabel={commodity.name}
            />
            {/* Any year can be typed: the book is not limited to a list. */}
            <Input
              aria-invalid={!validYear(yearText)}
              aria-label="Year"
              className={cn(adminInputClass, "font-adminmono w-[96px]")}
              inputMode="numeric"
              max={2100}
              min={2000}
              onChange={(e) => {
                const text = e.target.value;
                setYearText(text);
                if (validYear(text)) {
                  setYear(Number(text));
                  setPage(1);
                }
              }}
              title="Type any year from 2000 to 2100"
              type="number"
              value={yearText}
            />
            {ready ? (
              <ExportLink
                format="Excel"
                href={`${env.SERVER_URI}/api/v1/admin/reports/exports/${words.exportPath}${toQueryString(
                  buying
                    ? { commodityId, supplierId: partyId, year }
                    : { buyerId: partyId, commodityId, year },
                )}`}
                what={`The ${words.title.toLowerCase()} for this commodity and year`}
              >
                Export Excel
              </ExportLink>
            ) : null}
            <AdminButton variant="outline" asChild>
              <Link href="/admin/reports/book-settings">Book settings</Link>
            </AdminButton>
          </>
        }
      />

      {firstCommodities.isLoading || book.isLoading ? (
        <Skeleton className="h-[320px] w-full rounded-none" />
      ) : book.isError || firstCommodities.isError ? (
        <WidgetError
          onRetry={() => {
            void firstCommodities.refetch();
            if (ready) void book.refetch();
          }}
          what={`the ${words.title.toLowerCase()}`}
        />
      ) : !commodityId ? (
        <WidgetEmpty
          title="No commodities yet"
          hint="Add a commodity and record a purchase, and its book appears here."
        />
      ) : !data ? (
        <WidgetEmpty
          title={words.choose}
          hint={`The book is kept per ${words.people.slice(0, -1)}: pick one above to open their account, or "${words.all}" for everyone together.`}
        />
      ) : data.rows.length === 0 ? (
        <WidgetEmpty
          title={`No ${data.commodity.name} ${words.verb}${data.party ? ` with ${data.party.name}` : ""} in ${String(data.year)}`}
          hint={`${words.verb[0].toUpperCase()}${words.verb.slice(1)} recorded for this commodity and year show up here on their own.`}
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
          {meta && meta.totalPages > 1 ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <p className="text-[12px] text-adm-muted tabular-nums">
                Rows{" "}
                {((meta.page - 1) * meta.limit + 1).toLocaleString("en-GH")} to{" "}
                {Math.min(meta.page * meta.limit, meta.total).toLocaleString(
                  "en-GH",
                )}{" "}
                of {meta.total.toLocaleString("en-GH")}. The totals row and the
                running balance cover the whole book.
              </p>
              <ListPagination
                page={meta.page}
                totalPages={meta.totalPages}
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const title = (book: IPurchaseBook) =>
  `DB+_${book.commodity.name.toUpperCase()} ${WORDS[book.side].book}-${String(book.year)}${book.party ? ` - ${book.party.name.toUpperCase()}` : ""}`;

/** The sheet itself, scrolling sideways inside its own frame when narrow. */
function BookTable({ book }: { book: IPurchaseBook }) {
  const t = book.totals;
  const words = WORDS[book.side];
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
        aria-label={`${words.title}, scrolls sideways`}
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
                {words.details}
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
                title={`Weight taken off for foreign matter above the tolerance (${book.commodity.fmStandardPct === null ? "no rule set" : `standard ${String(book.commodity.fmStandardPct)}%, tolerance ${String(book.commodity.fmTolerancePct ?? book.commodity.fmStandardPct)}%`}): the percentage, then the kilos`}
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
                words.payable,
                words.paid,
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
                  key={`${row.kind}-${row.documentId ?? row.date}-${String(i)}`}
                >
                  <td className={cn(td, "whitespace-nowrap")}>
                    {sheetDate(row.date)}
                  </td>
                  <td className={cn(td, "text-left font-sans")}>
                    <Particulars row={row} side={book.side} />
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
