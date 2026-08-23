"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { ConsoleDataTable } from "@/components/admin/data-table";
import { DateOnlyCell } from "@/components/admin/date-cell";
import { HelpTip } from "@/components/admin/help-tip";
import {
  Absent,
  ActiveBadge,
} from "@/components/admin/registry/registry-bits";
import { RecordFacts } from "@/components/admin/record-facts";
import { DetailSkeleton } from "@/components/admin/skeletons";
import { Money } from "@/components/admin/trading/sale-bits";
import {
  AdminButton,
  AdminCard,
  DetailHeader,
  Mono,
  SectionHeading,
  ToneBadge,
  type Tone,
  adminLinkClass,
} from "@/components/admin/ui";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedisCompact, statValueCls } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { useGetPaymentAccountHistoryQuery } from "@/redux/payment-accounts/payment-accounts-api";
import type {
  AccountMovementSource,
  IAccountMovement,
} from "@/types/payment-account.types";

const LIST = "/admin/payment-accounts";

/**
 * Ledger + chip wording per movement source.
 *
 * `href` is optional on purpose. Two kinds of row have no page to open: an
 * account-native entry (a deposit, a bank charge, an opening position) belongs
 * to no document at all, and drawings and fixed assets are maintained on a
 * single list screen with no per-record route. Those render their reference as
 * plain text.
 *
 * Keyed by string rather than by AccountMovementSource because the server's
 * final branch is `ELSE m."type"::text`: a ledger added on the server arrives
 * here as a value this file has never heard of. Reading it through
 * `sourceOf` below keeps that a plain-looking row instead of a thrown render.
 */
const SOURCE: Record<
  string,
  { href?: (parentId: string) => string; label: string; tone: Tone }
> = {
  SALE_PAYMENT: {
    href: (id) => `/admin/sales/${id}`,
    label: "Sale",
    tone: "sky",
  },
  LAND_SALE_PAYMENT: {
    href: (id) => `/admin/land-sales/${id}`,
    label: "Land sale",
    tone: "leaf",
  },
  LAND_ACQUISITION_PAYMENT: {
    href: (id) => `/admin/land-acquisitions/${id}`,
    label: "Land purchase",
    tone: "harvest",
  },
  DRIVER_PAYMENT: {
    href: (id) => `/admin/shipments/${id}`,
    label: "Driver pay",
    tone: "slate",
  },
  EXPENSE_PAYMENT: {
    href: (id) => `/admin/expenses/${id}`,
    label: "Expense",
    tone: "alert",
  },
  PURCHASE_PAYMENT: {
    href: (id) => `/admin/purchases/${id}`,
    label: "Purchase",
    tone: "harvest",
  },
  DISBURSEMENT: {
    href: (id) => `/admin/disbursements/${id}`,
    label: "Disbursement",
    tone: "slate",
  },
  INPUT_GRANT: {
    href: (id) => `/admin/grants/${id}`,
    label: "Input grant",
    tone: "forest",
  },
  PRODUCE_REPAYMENT: {
    href: (id) => `/admin/repayments/${id}`,
    label: "Repayment",
    tone: "leaf",
  },
  PROPRIETOR_DRAWING: { label: "Drawing", tone: "alert" },
  FIXED_ASSET: { label: "Asset", tone: "slate" },

  // Account-native entries: money moving without a document behind it.
  CAPITAL: { label: "Own money in", tone: "leaf" },
  CHARGE: { label: "Bank charge", tone: "alert" },
  CORRECTION: { label: "Correction", tone: "harvest" },
  DEPOSIT: { label: "Money in", tone: "leaf" },
  OPENING: { label: "Opening balance", tone: "slate" },
  TRANSFER_IN: { label: "Moved in", tone: "sky" },
  TRANSFER_OUT: { label: "Moved out", tone: "sky" },
  WITHDRAWAL: { label: "Money out", tone: "alert" },
};

/**
 * The chip for a source, including one this build has never seen. An unmapped
 * value reads as itself in ordinary words rather than taking the screen down,
 * which is the same degradation the cash book already makes.
 */
const sourceOf = (source: AccountMovementSource) =>
  SOURCE[source] ?? {
    label: source.toLowerCase().replace(/_/g, " "),
    tone: "slate" as Tone,
  };

/**
 * What this row did to the account's balance: money in is positive, money
 * out negative. Amounts arrive signed within their own ledger (a reversal is
 * negative there), so an OUT reversal correctly reads as money coming BACK.
 * Null when redacted.
 */
const accountDelta = (m: IAccountMovement): number | null =>
  m.amountGhs === null
    ? null
    : m.direction === "IN"
      ? m.amountGhs
      : -m.amountGhs;

/** One all-time flow tile (in / out / net), compact like the KPI tiles. */
function FlowTile({
  hint,
  label,
  value,
}: {
  /** One sentence on what the figure counts, on hover beside the label. */
  hint?: string;
  label: string;
  value: number | null;
}) {
  const text = formatCedisCompact(value);
  return (
    <AdminCard className="min-w-0 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        <span className="min-w-0">{label}</span>
        {hint ? <HelpTip label={`What does ${label} count?`} text={hint} /> : null}
      </div>
      <div className="mt-1">
        <Mono
          className={cn("min-w-0 font-bold text-adm-ink", statValueCls(text))}
        >
          <Money compact value={value} />
        </Mono>
      </div>
    </AdminCard>
  );
}

/**
 * One company account's page: its facts, its all-time in/net/out position,
 * and the paginated movement history - every payment row from the sale,
 * land-sale and acquisition ledgers that named this account. The history
 * endpoint returns the account alongside the rows, so one query drives the
 * whole screen. Amounts may be redacted (null) per money visibility; the
 * rows themselves stay so staff can confirm "did the transfer arrive?".
 */
export function PaymentAccountDetail({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { data, isLoading, isFetching, isError, error, refetch } =
    useGetPaymentAccountHistoryQuery({ id, page, limit: pageSize });

  const columns = useMemo<ColumnDef<IAccountMovement, unknown>[]>(
    () => [
      {
        accessorFn: (m) => m.paidAt,
        id: "paidAt",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => <DateOnlyCell value={row.original.paidAt} />,
        meta: { card: "meta", className: "px-4 whitespace-nowrap" },
      },
      {
        accessorFn: (m) => m.transactionNo,
        id: "receipt",
        header: "Receipt",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 @2xl/table:justify-start">
            <Mono className="text-adm-ink">
              {row.original.transactionNo}
            </Mono>
            {row.original.isReversal ? (
              <ToneBadge tone="alert">Reversal</ToneBadge>
            ) : null}
          </span>
        ),
        meta: { card: "meta", className: "px-4" },
      },
      {
        accessorFn: (m) => m.source,
        id: "source",
        header: "Source",
        enableSorting: false,
        cell: ({ row }) => {
          const s = sourceOf(row.original.source);
          return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
        },
        meta: { card: "meta", className: "px-4" },
      },
      {
        accessorFn: (m) => m.counterparty,
        id: "counterparty",
        header: "Counterparty",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="block min-w-0 @2xl/table:max-w-[90%] [overflow-wrap:anywhere] @2xl/table:truncate text-adm-ink">
            {row.original.counterparty}
          </span>
        ),
        meta: { card: "title", stretch: true, className: "px-4" },
      },
      {
        accessorFn: (m) => m.parentNo,
        id: "against",
        header: "Against",
        enableSorting: false,
        cell: ({ row }) => {
          const m = row.original;
          const href = sourceOf(m.source).href?.(m.parentId);
          // No href means there is nothing to open: an account-native entry has
          // no document, and drawings and assets have no per-record page. The
          // reference still prints, because it is what staff quote.
          if (!href) {
            return (
              <Mono className="text-adm-ink">{m.parentNo}</Mono>
            );
          }
          return (
            <Link
              href={href}
              onClick={(e) => e.stopPropagation()}
              className={cn(adminLinkClass, "font-adminmono tabular-nums")}
            >
              {m.parentNo}
            </Link>
          );
        },
        meta: { card: "meta", className: "px-4" },
      },
      {
        accessorFn: (m) => m.method,
        id: "method",
        header: "Method",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-adm-ink">{row.original.method}</span>
        ),
        meta: { card: "meta", className: "px-4" },
      },
      {
        accessorFn: (m) => m.reference ?? "",
        id: "reference",
        header: "Reference",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.reference ? (
            <Mono className="block min-w-0 @2xl/table:max-w-[19rem] [overflow-wrap:anywhere] @2xl/table:truncate text-adm-muted">
              {row.original.reference}
            </Mono>
          ) : (
            <Absent />
          ),
        // Reconciliation detail: only in genuinely wide containers. The empty
        // accessor value also drops the row from the mobile card when there is
        // no reference to show.
        meta: { card: "meta", className: "hidden px-4 2xl:table-cell" },
      },
      {
        accessorFn: (m) => accountDelta(m) ?? 0,
        id: "amountGhs",
        header: "Amount",
        enableSorting: false,
        cell: ({ row }) => {
          const delta = accountDelta(row.original);
          return (
            <Mono
              className={cn(
                "whitespace-nowrap font-semibold",
                delta === null
                  ? "text-adm-muted"
                  : delta < 0
                    ? "text-console-red"
                    : "text-console",
              )}
            >
              {delta !== null && delta > 0 ? "+" : ""}
              <Money value={delta} />
            </Mono>
          );
        },
        meta: { card: "trailing", className: "px-4" },
      },
    ],
    [],
  );

  if (isLoading) return <DetailSkeleton main="ledger" facts={6} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const account = data.summary.account;
  const rows = data.data;
  const where = account.bankName ?? account.provider;

  return (
    <div className="max-w-[1120px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Accounts", href: LIST }]}
        current="Payment account details"
      />
      <DetailHeader
        title="Payment account details"
        hint="One account customers pay into, and everything received through it."
        badges={<ActiveBadge isActive={account.isActive} />}
        actions={
          <AdminButton asChild variant="outline">
            <Link href={`${LIST}/${id}/edit`}>Edit account</Link>
          </AdminButton>
        }
      />

      {/* The account's position: what it has received, what left it, and
          where that nets out - over the WHOLE history, not the page. */}
      <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
        <FlowTile
          hint="Everything ever paid into this account, counting all of its history rather than this page."
          label="Money in"
          value={data.summary.inGhs}
        />
        <FlowTile
          hint="Everything ever refunded or reversed back out of this account."
          label="Money out"
          value={data.summary.outGhs}
        />
        <FlowTile
          hint="What this account has actually taken in: everything in, less everything back out."
          label="Net"
          value={data.summary.netGhs}
        />
      </div>

      {/* The facts a caller quotes down the phone. */}
      <AdminCard className="mb-4 px-5 py-3">
        <RecordFacts
          columns={3}
          facts={[
            // What staff call this account. The heading says what the page
            // is, so the record says which account it is about.
            { label: "Label", value: account.label },
            {
              label: "Account number",
              mono: true,
              value: account.accountNumber,
            },
            { label: "Account name", value: account.accountName },
            {
              label: "Bank / network",
              value: where
                ? `${where}${account.branch ? ` · ${account.branch}` : ""}`
                : null,
            },
            { label: "Kind", value: account.kind },
            {
              label: "On invoices",
              value: account.showOnInvoice ? "Printed" : "Internal only",
            },
            { label: "Sort code", mono: true, value: account.sortCode },
            { label: "SWIFT", mono: true, value: account.swiftCode },
            {
              full: true,
              label: "Instructions",
              value: account.instructions,
            },
          ]}
        />
      </AdminCard>

      {/* The history: every payment row that named this account. */}
      <SectionHeading
        className="mb-1.5"
        hint="Every payment that named this account, in or out, newest first."
      >
        Movements
      </SectionHeading>
      <AdminCard className="overflow-hidden">
        <ConsoleDataTable<IAccountMovement>
          columns={columns}
          data={rows}
          itemNoun="movements"
          isFetching={isFetching}
        isFiltered={false}
          serverPagination={{
            totalCount: data.meta.total,
            page,
            pageSize,
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
          emptyState={
            <EmptyState
              variant="plain"
              title="No movements yet"
              description="No payment has named this account. It will appear here the moment a sale receipt, land-sale receipt or seller payment is recorded against it."
            />
          }
        />
      </AdminCard>
    </div>
  );
}
