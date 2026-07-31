"use client";

import { useCallback, useEffect, useRef } from "react";
import { AdminCard, ToneBadge, type Tone } from "@/components/admin/ui";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import {
  MOMO_CHANNEL_LABELS,
  type BalanceTransferStatus,
  type DisbursementRail,
  type DisbursementStatus,
  type IDisbursement,
  type MomoChannel,
} from "@/types/disbursement.types";

/**
 * Shared vocabulary for every money-out screen, so the register, the detail
 * page and the field app never describe the same state in three different
 * ways.
 */

const STATUS_TONE: Record<DisbursementStatus, Tone> = {
  FAILED: "alert",
  PENDING: "slate",
  SUBMITTED: "sky",
  SUCCESS: "leaf",
};

/**
 * The wording is chosen to be honest about what is actually known. "Sent" is
 * reserved for SUCCESS; a SUBMITTED row is one Hubtel has taken but not yet
 * confirmed, and calling that "sent" is how somebody ends up paying twice.
 */
const STATUS_LABEL: Record<DisbursementStatus, string> = {
  FAILED: "Failed",
  PENDING: "Not confirmed",
  SUBMITTED: "With Hubtel",
  SUCCESS: "Sent",
};

export function DisbursementStatusBadge({
  needsAttention,
  status,
}: {
  needsAttention?: boolean;
  status: DisbursementStatus;
}) {
  // Needing a human outranks the underlying status in the list: it is the one
  // state somebody has to act on.
  if (needsAttention) {
    return <ToneBadge tone="alert">Needs checking</ToneBadge>;
  }
  return <ToneBadge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</ToneBadge>;
}

const TRANSFER_TONE: Record<BalanceTransferStatus, Tone> = {
  FAILED: "alert",
  PENDING: "slate",
  SUBMITTED: "sky",
  SUCCESS: "leaf",
};

const TRANSFER_LABEL: Record<BalanceTransferStatus, string> = {
  FAILED: "Failed",
  PENDING: "Not confirmed",
  SUBMITTED: "With Hubtel",
  SUCCESS: "Moved",
};

export function TransferStatusBadge({
  needsAttention,
  status,
}: {
  needsAttention?: boolean;
  status: BalanceTransferStatus;
}) {
  if (needsAttention) {
    return <ToneBadge tone="alert">Needs checking</ToneBadge>;
  }
  return (
    <ToneBadge tone={TRANSFER_TONE[status]}>{TRANSFER_LABEL[status]}</ToneBadge>
  );
}

export const RAIL_LABEL: Record<DisbursementRail, string> = {
  BANK: "Bank transfer",
  MOMO: "Mobile money",
};

export const RAIL_OPTIONS = [
  { label: "Mobile money", value: "MOMO" },
  { label: "Bank transfer", value: "BANK" },
];

export const MOMO_CHANNEL_OPTIONS = (
  Object.keys(MOMO_CHANNEL_LABELS) as MomoChannel[]
).map((value) => ({ label: MOMO_CHANNEL_LABELS[value], value }));

export const STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Sent", value: "SUCCESS" },
  { label: "With Hubtel", value: "SUBMITTED" },
  { label: "Not confirmed", value: "PENDING" },
  { label: "Failed", value: "FAILED" },
];

export const RAIL_FILTER_OPTIONS = [
  { label: "Both rails", value: "all" },
  { label: "Mobile money", value: "MOMO" },
  { label: "Bank transfer", value: "BANK" },
];

/** Where the money actually went, in one line, whichever rail was used. */
export function recipientLine(d: IDisbursement): string {
  if (d.rail === "MOMO") {
    const network = d.channel
      ? MOMO_CHANNEL_LABELS[d.channel as MomoChannel]
      : null;
    return [d.recipientMsisdn, network].filter(Boolean).join(" · ");
  }
  return [d.bankAccountNumber, d.bankName].filter(Boolean).join(" · ");
}

/** Amount in the console's mono figure treatment. */
export function Money({
  className,
  value,
}: {
  className?: string;
  value: null | number;
}) {
  return (
    <span className={`font-adminmono tabular-nums ${className ?? ""}`}>
      {formatCedis(value)}
    </span>
  );
}

/**
 * A stable key for one form OPENING, reused by every attempt at submitting
 * it. That is exactly what makes "just tap send again" safe advice on a bad
 * connection: a retry carries the same key, so the server returns the one
 * payout that already happened instead of making a second one.
 *
 * A ref written from an effect, not state: the key is never rendered, so
 * setting state for it would cascade a render nothing on screen depends on.
 * The getter is called from the submit handler, well after the effect has
 * run, and falls back to a fresh key rather than ever returning nothing.
 */
export function useIdempotencyKey(open: boolean): () => string {
  const key = useRef<null | string>(null);

  useEffect(() => {
    if (open) key.current = globalThis.crypto.randomUUID();
  }, [open]);

  return useCallback(() => key.current ?? globalThis.crypto.randomUUID(), []);
}

/**
 * An AdminCard with the console's small uppercase section heading. The
 * heading treatment is copied from the land and sale detail screens rather
 * than invented, so the money-out pages read as part of the same console.
 */
export function TitledCard({
  children,
  className,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  title: string;
}) {
  return (
    <AdminCard className={cn("px-5 py-3", className)}>
      <div className="mb-1 text-[10.5px] font-bold tracking-[0.09em] text-adm-muted uppercase">
        {title}
      </div>
      {children}
    </AdminCard>
  );
}
