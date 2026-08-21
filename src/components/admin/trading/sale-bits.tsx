"use client";

import { CountUp } from "@/components/admin/count-up";
import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import {
  formatCedis,
  formatCedisCompact,
  MONEY_HIDDEN,
} from "@/lib/format-money";
import type {
  MilestoneTrigger,
  SaleStatus,
} from "@/types/admin-sale.types";

/** Status → console tone + label. */
const SALE_STATUS: Record<SaleStatus, { label: string; tone: Tone }> = {
  CANCELLED: { label: "Cancelled", tone: "slate" },
  COMPLETED: { label: "Completed", tone: "forest" },
  CONFIRMED: { label: "Confirmed", tone: "sky" },
  DRAFT: { label: "Draft", tone: "harvest" },
  FULFILLED: { label: "Fulfilled", tone: "leaf" },
};

/** What each state means for the order, and what has to happen next. */
const SALE_STATUS_HELP: Record<SaleStatus, string> = {
  CANCELLED:
    "Called off, so it no longer counts towards sales or money owed to you.",
  COMPLETED: "Delivered and paid in full, so nothing is left to do on it.",
  CONFIRMED:
    "Agreed with the buyer: payment terms now apply and it can be loaded.",
  DRAFT: "Still being put together, so the buyer owes nothing on it yet.",
  FULFILLED:
    "Everything ordered has gone out; only payment may still be outstanding.",
};

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  const s = SALE_STATUS[status];
  return (
    <HelpWrap text={SALE_STATUS_HELP[status]}>
      <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
    </HelpWrap>
  );
}

export const SALE_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "DRAFT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Fulfilled", value: "FULFILLED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

const TRIGGER_LABEL: Record<MilestoneTrigger, string> = {
  BEFORE_LOADING: "Before loading",
  ON_ARRIVAL: "On arrival",
  ON_DEMAND: "On demand",
};

export const milestoneTriggerLabel = (t: MilestoneTrigger): string =>
  TRIGGER_LABEL[t];

/** "05 Jul 2026" - the console's date rendering (shared idiom). */
export function formatSaleDate(iso: string): string {
  return formatDateTime(iso);
}

/**
 * A money value or the redaction placeholder. Sales money is `number | null`;
 * null means the API withheld it for this user (financial visibility).
 *
 * `compact` shortens large figures (GH₵ 344.7k) for places where the width is
 * fixed by a grid and the number is not - a KPI tile on a 280px phone. The
 * exact amount is always on the element's `title`, so nothing is lost, and a
 * rounded figure is far safer than a clipped one: "GH₵ 344,680.6…" reads as a
 * different, smaller number.
 */
export function Money({
  animate = false,
  compact = false,
  value,
}: {
  /** Count the figure up to its value: for headline tiles, never cells. */
  animate?: boolean;
  compact?: boolean;
  value: number | null;
}) {
  if (value === null) return <span className="text-adm-faint">{MONEY_HIDDEN}</span>;
  if (!compact) {
    return animate ? (
      <CountUp value={value} format={formatCedis} />
    ) : (
      <>{formatCedis(value)}</>
    );
  }
  return (
    <span title={formatCedis(value)}>
      {animate ? (
        <CountUp value={value} format={formatCedisCompact} />
      ) : (
        formatCedisCompact(value)
      )}
    </span>
  );
}

/** Today as a YYYY-MM-DD value for date inputs. */
export const todayInputValue = (): string =>
  new Date().toISOString().slice(0, 10);

export const PAYMENT_METHOD_OPTIONS = [
  { label: "Cash", value: "CASH" },
  { label: "Mobile money", value: "MOMO" },
  { label: "Bank transfer", value: "BANK" },
] as const;
