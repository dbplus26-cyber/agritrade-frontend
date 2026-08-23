"use client";

import { AdminButton, DetailHeader } from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import {
  AuthorisedSignature,
  DocumentLogo,
} from "@/components/admin/document-marks";
import { DocumentSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatDateOnly } from "@/lib/format-date";
import { formatKg } from "@/lib/format-money";
import { useGetPayableAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import {
  saleInvoicePdfUrl,
  useGetSaleQuery,
} from "@/redux/sales/admin-sales-api";
import { useGetSettingsQuery } from "@/redux/settings/settings-api";
import type { IPayableAccount } from "@/types/payment-account.types";
import { Money, formatSaleDate } from "./sale-bits";
import {
  hasSettledTotal,
  saleBalanceGhs,
  saleIsPaidInFull,
} from "./sale-payable";

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
  // Name and number are conditional like every other row: an account that
  // carries neither is not a payment destination, and an empty "Account
  // number:" on an invoice is worse than no line at all.
  const rows: [string, string][] = [];
  if (account.accountName) rows.push(["Account name", account.accountName]);
  if (account.accountNumber) {
    rows.push([
      account.kind === "MOMO" ? "MoMo number" : "Account number",
      account.accountNumber,
    ]);
  }
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
    <div className="break-inside-avoid border border-adm-line p-3">
      <div className="text-[10.5px] font-bold tracking-[0.06em] text-console uppercase">
        {heading}
      </div>
      <dl className="mt-1.5 text-[11px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 py-[1px]">
            <dt className="text-adm-muted">{label}</dt>
            <dd className="text-right font-semibold break-all">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1.5 text-[10.5px] text-adm-muted">
        Quote {reference} as the reference.
        {account.instructions ? ` ${account.instructions}` : ""}
      </p>
    </div>
  );
}

/**
 * A print-friendly invoice / receipt for a sale: live data, A4-styled via
 * `print:` utilities. The console chrome is hidden when
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
  // Billed against what the sale is PAYABLE at, which after arrival is the
  // settled figure. Billing the agreement would send a buyer a demand for
  // grain that evaporated on the Tamale road.
  const balance = saleBalanceGhs(s);
  const isReceipt = saleIsPaidInFull(s);
  const company = settings?.data.settings;
  // A settled sale is not asking for money, so printing account numbers on it
  // only gives the buyer a second, staler place to read them from.
  const accounts = isReceipt ? [] : (payable?.data.accounts ?? []);

  const title = isReceipt ? "Receipt" : "Invoice";

  return (
    <div>
      <DetailNav
        className="print:hidden"
        crumbs={[
          DASHBOARD_CRUMB,
          { label: "Sales", href: "/admin/sales" },
          { label: s.transactionNo, href: `/admin/sales/${s.id}` },
        ]}
        current={title}
        backLabel="Back to sale"
      />
      <DetailHeader
        className="print:hidden"
        title={title}
        sub={
          isReceipt
            ? `Proof that ${s.buyer.name} settled this sale in full`
            : `What ${s.buyer.name} still owes on this sale, and where to pay it`
        }
        actions={
          // The server renders this same document as a real A4 PDF, so the
          // one action opens that - the viewer previews it true to size and
          // printing happens from there. The browser's own print dialog
          // places the sheet top-left with dead space around it.
          <AdminButton asChild>
            <a
              href={saleInvoicePdfUrl(s.id)}
              target="_blank"
              rel="noopener noreferrer"
            >
              View PDF
            </a>
          </AdminButton>
        }
      />

      {/* Left-aligned like every other console page - the sheet keeps its own
          720px measure so it still reads as a piece of paper. Squared and
          1.5px-bordered to match AdminCard. */}
      <div className="max-w-[720px] border border-adm-line bg-white p-8 text-adm-ink">
        <div className="flex items-start justify-between border-b-2 border-adm-strong pb-3">
          <div className="flex items-start gap-3">
            <DocumentLogo />
            <div>
            <div className="text-[20px] font-extrabold tracking-[0.12em] text-console">
              DB PLUS
            </div>
            <div className="text-[10.5px] tracking-[0.06em] text-adm-muted uppercase">
              Trading
            </div>
            {/* From the owner's settings, never hardcoded: an invoice that
                names a stale address is a document the buyer cannot act on. */}
            {company?.companyContactAddress ? (
              <div className="mt-1 text-[10.5px] text-adm-muted">
                {company.companyContactAddress}
              </div>
            ) : null}
            {company?.companyContactPhone ? (
              <div className="text-[10.5px] text-adm-muted">
                {company.companyContactPhone}
              </div>
            ) : null}
            {company?.companyContactEmail ? (
              <div className="text-[10.5px] text-adm-muted">
                {company.companyContactEmail}
              </div>
            ) : null}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-bold">
              {isReceipt ? "RECEIPT" : "INVOICE"}
            </div>
            <div className="text-[11px] text-adm-muted">
              Ref {s.transactionNo}
            </div>
            <div className="text-[11px] text-adm-muted">
              {formatSaleDate(s.confirmedAt ?? s.createdAt)}
            </div>
          </div>
        </div>

        <div className="mt-4 text-[11.5px]">
          <div className="mb-1 text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
            Billed to
          </div>
          <div className="font-semibold">{s.buyer.name}</div>
          {s.buyer.phone ? <div>{s.buyer.phone}</div> : null}
        </div>

        <table className="mt-6 w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="border-y border-adm-strong text-left">
              <th className="py-2">Commodity</th>
              <th className="py-2 text-right">Weight</th>
              <th className="py-2 text-right">Price/kg</th>
              <th className="py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {s.lines.map((l) => (
              <tr key={l.id} className="border-b border-adm-line">
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

        <div className="mt-4 ml-auto w-full max-w-[280px] text-[11.5px]">
          <div className="flex justify-between py-1">
            <span className="text-adm-muted">Agreed total</span>
            <span className="font-semibold">
              <Money value={s.agreedTotalGhs} />
            </span>
          </div>
          {/* The re-weigh, stated on the document rather than folded silently
              into the total. The buyer signed for the agreed price and is being
              billed for less: the paperwork has to say why, or the difference
              reads as a mistake on somebody's side. */}
          {hasSettledTotal(s) ? (
            <div className="flex justify-between py-1">
              <span className="text-adm-muted">Settled on arrival</span>
              <span className="font-semibold">
                <Money value={s.settledTotalGhs} />
              </span>
            </div>
          ) : null}
          <div className="flex justify-between py-1">
            <span className="text-adm-muted">Paid</span>
            <span>
              <Money value={s.paidGhs} />
            </span>
          </div>
          <div className="flex justify-between border-t border-adm-strong py-1.5 text-[12.5px] font-bold">
            <span>{isReceipt ? "Settled" : "Balance due"}</span>
            <span>{isReceipt ? "Paid in full" : <Money value={balance} />}</span>
          </div>
        </div>

        {s.payments.length > 0 ? (
          <div className="mt-6 text-[11px]">
            <div className="mb-1 text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
              Payments received
            </div>
            {s.payments.map((p) => (
              <div
                key={p.id}
                className="flex justify-between border-b border-adm-hairline py-1"
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
            <div className="mb-1.5 text-[10.5px] font-bold tracking-[0.08em] text-adm-muted uppercase">
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
          <p className="mt-6 border border-dashed border-adm-line p-3 text-[10.5px] text-adm-muted print:hidden">
            No payment accounts are published yet, so this invoice cannot tell
            the buyer where to send the money. Add one under Directory →
            Payment Accounts.
          </p>
        ) : null}

        {/* Signed the moment it is issued, same as the PDF. */}
        <div className="mt-8 flex justify-end">
          <AuthorisedSignature />
        </div>

        <p className="mt-6 text-[10.5px] text-adm-muted">
          Thank you for trading with DB Plus.
        </p>
      </div>
    </div>
  );
}
