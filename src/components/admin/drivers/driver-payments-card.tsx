"use client";

import { useState } from "react";

import { HelpTip, HelpWrap } from "@/components/admin/help-tip";
import {
  AdminCard,
  Mono,
  PdfLink,
  SectionHeading,
  ToneBadge,
} from "@/components/admin/ui";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ListPagination } from "@/components/ui/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { receiptPdfUrl } from "@/lib/receipt-pdf-url";
import { cn } from "@/lib/utils";
import { useGetDriverPaymentsQuery } from "@/redux/drivers/drivers-api";
import type { IDriverPaymentLedgerRow } from "@/types/driver-settlement.types";

/**
 * What this driver has been paid, and their copy of every receipt.
 *
 * Recording a payment emails the driver their voucher - when the directory
 * holds an address for them. Plenty of drivers have none, and those are exactly
 * the people who turn up at the office instead, which is what this card is
 * for: the same vouchers, fetched on the spot, on the record the counter staff
 * already has open. It stays here for drivers who DO have an email too, because
 * a driver who deleted the message still comes in asking for a copy.
 *
 * Money may be redacted to null for a reader without financial visibility. Rows
 * survive that, because WHICH payments exist and WHEN is operational truth; the
 * amounts are the only part that goes.
 */

const PER_PAGE = 10;

/** "04 Aug 2026" - the console's one date, unambiguous for a Ghanaian reader. */
const shortDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

/** A money figure, or the redaction placeholder. Never prints "null". */
function Figure({
  className,
  value,
}: {
  className?: string;
  value: null | number;
}) {
  if (value === null) return <span className="text-adm-faint">Hidden</span>;
  return (
    <Mono className={cn("tabular-nums", className)}>{formatCedis(value)}</Mono>
  );
}

function PaymentRow({ payment }: { payment: IDriverPaymentLedgerRow }) {
  const reversed = payment.reversedByPaymentId !== null;
  return (
    <li
      className={cn(
        "flex flex-col gap-1.5 py-3 @min-[520px]/driverpay:flex-row @min-[520px]/driverpay:items-baseline @min-[520px]/driverpay:gap-3",
        payment.isReversal && "opacity-80",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <Mono className="text-[10.5px] text-adm-faint">
            {payment.transactionNo}
          </Mono>
          <span className="text-[10.5px] text-adm-faint">
            {shortDate(payment.paidAt)}
          </span>
          <span className="text-[10.5px] text-adm-faint">{payment.method}</span>
          {payment.isReversal ? (
            <HelpWrap text="This row cancels an earlier payment. Nothing is deleted, so the history still shows what happened.">
              <ToneBadge tone="slate">Reversal</ToneBadge>
            </HelpWrap>
          ) : null}
          {reversed ? (
            <HelpWrap text="This payment was cancelled by a later reversal row.">
              <ToneBadge tone="slate">Reversed</ToneBadge>
            </HelpWrap>
          ) : null}
        </div>
        {/* The trip. A driver does not know their shipment numbers, so the
            destination leads and the document number follows it. */}
        <p className="mt-0.5 min-w-0 text-[11.5px] text-adm-body [overflow-wrap:anywhere]">
          {payment.shipment.destination}
          <span className="text-adm-faint">
            {" "}
            · {payment.shipment.transactionNo}
          </span>
        </p>
        {payment.reversalReason ? (
          <p className="mt-0.5 text-[11px] text-adm-muted [overflow-wrap:anywhere]">
            {payment.reversalReason}
          </p>
        ) : null}
      </div>

      {/* Figure and voucher share their own line below 520px: on a phone a
          date, a trip and a link sharing a row squeeze the money to a sliver. */}
      <div className="flex flex-none items-baseline justify-between gap-2 @min-[520px]/driverpay:justify-end">
        <Figure
          className={cn(
            "text-[12px] font-semibold",
            payment.isReversal ? "text-console-red" : "text-adm-ink",
          )}
          value={payment.amountGhs}
        />
        <PdfLink href={receiptPdfUrl("driver-payment", payment.id)}>
          Receipt
        </PdfLink>
      </div>
    </li>
  );
}

export function DriverPaymentsCard({ driverId }: { driverId: string }) {
  const [page, setPage] = useState(1);
  const { data, error, isError, isLoading, refetch } = useGetDriverPaymentsQuery(
    { driverId, limit: PER_PAGE, page },
  );

  if (isLoading) {
    return (
      <AdminCard className="p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-8 w-32" />
        <Skeleton className="mt-5 h-16 w-full" />
      </AdminCard>
    );
  }
  if (isError || !data) {
    // A 404 here means the driver itself is gone, and the record above this
    // card already says so. Stacking a second "we couldn't find it" under it
    // reads as two separate failures rather than one missing driver.
    const failure = extractApiError(error);
    if (failure.status === 404) return null;
    return (
      <ErrorMessage
        description={failure.message}
        onRetry={() => void refetch()}
      />
    );
  }

  const { data: payments, meta, summary } = data;

  return (
    // Its OWN container. This card sits under a record whose column width the
    // viewport does not describe, so every breakpoint inside it measures the
    // card rather than the window.
    <AdminCard className="@container/driverpay p-5">
      <SectionHeading
        className="mb-4"
        hint="Every payment made to this driver, across every trip, with the receipt for each one."
        actions={
          <p className="text-[11px] text-adm-muted">
            {meta.total === 1 ? "1 payment" : `${String(meta.total)} payments`}
          </p>
        }
      >
        Payments to this driver
      </SectionHeading>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
            Paid in total
          </span>
          <HelpTip
            label="What is the total?"
            text="Everything paid to this driver across all their trips, less anything reversed."
          />
        </div>
        {/* The headline: 26px because it is the one figure somebody opens this
            card to find. */}
        <Figure
          className="text-[19px] leading-[1.15] font-bold text-adm-ink sm:text-[26px]"
          value={summary.paidGhs}
        />
      </div>

      {/* Where the receipts went. Counter staff should never have to guess
          whether the driver already has a copy in their inbox. */}
      <p className="mt-3 min-w-0 text-[11px] leading-[1.5] text-adm-muted [overflow-wrap:anywhere]">
        {summary.driverEmail ? (
          <>
            Each receipt is emailed to{" "}
            <span className="text-adm-body">{summary.driverEmail}</span> when the
            payment is recorded. Download a copy below if it is needed again.
          </>
        ) : (
          <>
            This driver has no email address on file, so nothing has been sent to
            them. Download or print a receipt below when they ask for one.
          </>
        )}
      </p>

      {payments.length === 0 ? (
        <EmptyState
          className="mt-2"
          description="When this driver is paid for a trip, the payment and its receipt are filed here."
          title="No payments yet"
          variant="plain"
        />
      ) : (
        <>
          {/* divide-y, not a border per row: the hairline belongs BETWEEN
              rows, so the last has no rule running into the card's edge. */}
          <ul className="mt-4 divide-y divide-adm-hairline border-t border-adm-hairline">
            {payments.map((p) => (
              <PaymentRow key={p.id} payment={p} />
            ))}
          </ul>
          <ListPagination
            className="mt-4"
            onPageChange={setPage}
            page={meta.page}
            totalPages={meta.totalPages}
          />
        </>
      )}
    </AdminCard>
  );
}
