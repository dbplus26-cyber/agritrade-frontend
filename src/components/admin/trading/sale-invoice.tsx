"use client";

import Link from "next/link";
import { AdminButton, AdminPageHeader } from "@/components/admin/ui";
import { DocumentSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly } from "@/lib/format-date";
import { formatKg } from "@/lib/format-money";
import { useGetPayableAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import { useGetSaleQuery } from "@/redux/sales/admin-sales-api";
import { useGetSettingsQuery } from "@/redux/settings/settings-api";
import type { IPayableAccount } from "@/types/payment-account.types";
import { Money, formatSaleDate } from "./sale-bits";

/**
 * One payment destination as the buyer reads it. Whatever the kind, it is a
 * heading plus label/value rows they read out at the counter, so the layout
 * does not branch on kind - only the rows differ.
 */
function PayToCard({
  account,
  reference,
}: {
  account: IPayableAccount;
  reference: string;
}) {
  const rows: [string, string][] = [
    ["Account name", account.accountName],
    [
      account.kind === "MOMO" ? "MoMo number" : "Account number",
      account.accountNumber,
    ],
  ];
  if (account.bankName) rows.push(["Bank", account.bankName]);
  if (account.branch) rows.push(["Branch", account.branch]);
  if (account.provider) rows.push(["Network", account.provider]);
  if (account.sortCode) rows.push(["Sort code", account.sortCode]);
  if (account.swiftCode) rows.push(["SWIFT", account.swiftCode]);

  const heading =
    account.kind === "MOMO"
      ? `Mobile money${account.provider ? ` (${account.provider})` : ""}`
      : (account.bankName ?? "Bank transfer");

  return (
    <div className="break-inside-avoid border border-soil/30 p-3">
      <div className="text-[11px] font-bold tracking-[0.06em] text-console uppercase">
        {heading}
      </div>
      <dl className="mt-1.5 text-[12px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-[1px]">
            <dt className="text-soil">{label}</dt>
            <dd className="text-right font-semibold break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[10.5px] text-soil">
        Quote {reference} as the reference.
        {account.instructions ? ` ${account.instructions}` : ""}
      </p>
    </div>
  );
}

/**
 * A print-friendly invoice / receipt for a sale (design doc ADR-004): live
 * data, A4-styled via `print:` utilities. The console chrome is hidden when
 * printing; only the document remains. A fully-paid sale reads as a receipt,
 * an outstanding one as an invoice.
 */
export function SaleInvoice({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetSaleQuery(id);
  // Both are supporting detail: the document still prints if either fails,
  // it just prints without the contact block or the account details rather
  // than blocking a buyer's invoice on a settings read.
  const { data: settings } = useGetSettingsQuery();
  const { data: payable } = useGetPayableAccountsQuery();

  if (isLoading) return <DocumentSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const s = data.data.sale;
  const isReceipt = s.balanceGhs === 0;
  const company = settings?.data.settings;
  // A settled sale is not asking for money, so printing account numbers on it
  // only gives the buyer a second, staler place to read them from.
  const accounts = isReceipt ? [] : (payable?.data.accounts ?? []);

  return (
    <div>
      <div className="print:hidden">
        <Link
          href={`/admin/sales/${s.id}`}
          className="mb-2 inline-block text-[13px] text-console underline-offset-2 hover:underline"
        >
          ← Back to sale
        </Link>
        <AdminPageHeader
          title={`${isReceipt ? "Receipt" : "Invoice"} ${s.transactionNo}`}
          sub={
            isReceipt
              ? `Proof that ${s.buyer.name} settled this sale in full`
              : `What ${s.buyer.name} still owes on this sale, and where to pay it`
          }
          actions={
            <AdminButton className="h-9 px-4" onClick={() => window.print()}>
              Print
            </AdminButton>
          }
        />
      </div>

      {/* Left-aligned like every other console page - the sheet keeps its own
          720px measure so it still reads as a piece of paper. Squared and
          1.5px-bordered to match AdminCard. */}
      <div className="max-w-[720px] border-[1.5px] border-soil/30 bg-white p-8 text-ink print:max-w-none print:border-0 print:p-0">
        <div className="flex items-start justify-between border-b-2 border-ink pb-3">
          <div>
            <div className="text-[20px] font-extrabold tracking-[0.12em] text-console">
              DB PLUS
            </div>
            <div className="text-[11px] tracking-[0.06em] text-soil uppercase">
              Trading
            </div>
            {/* From the owner's settings, never hardcoded: an invoice that
                names a stale address is a document the buyer cannot act on. */}
            {company?.companyContactAddress ? (
              <div className="mt-1 text-[11px] text-soil">
                {company.companyContactAddress}
              </div>
            ) : null}
            {company?.companyContactPhone ? (
              <div className="text-[11px] text-soil">
                {company.companyContactPhone}
              </div>
            ) : null}
            {company?.companyContactEmail ? (
              <div className="text-[11px] text-soil">
                {company.companyContactEmail}
              </div>
            ) : null}
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
                  {/* `paidAt` is captured as a calendar date, so it carries a
                      midnight stamp nobody entered - printing it would put a
                      made-up time on a document the buyer keeps. */}
                  {formatDateOnly(p.paidAt)} · {p.method}
                  {p.reference ? ` · ${p.reference}` : ""}
                </span>
                <Money value={p.amountGhs} />
              </div>
            ))}
          </div>
        ) : null}

        {accounts.length > 0 ? (
          <div className="mt-6">
            <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-soil uppercase">
              How to pay
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {accounts.map((account) => (
                <PayToCard
                  key={`${account.kind}-${account.accountNumber}`}
                  account={account}
                  reference={s.transactionNo}
                />
              ))}
            </div>
          </div>
        ) : !isReceipt ? (
          // Silence here would read as "no payment needed". Say plainly that
          // the details are missing so staff notice before the buyer does.
          <p className="mt-6 border border-dashed border-soil/40 p-3 text-[11.5px] text-soil print:hidden">
            No payment accounts are published yet, so this invoice cannot tell
            the buyer where to send the money. Add one under Directory →
            Payment Accounts.
          </p>
        ) : null}

        <p className="mt-8 text-[11px] text-soil">
          Thank you for trading with DB Plus.
        </p>
      </div>
    </div>
  );
}
