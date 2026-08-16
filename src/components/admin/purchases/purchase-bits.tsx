import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import { formatCedis, MONEY_HIDDEN } from "@/lib/format-money";
import {
  type IPurchase,
  type IPurchaseCost,
  PurchaseStatus,
} from "@/types/purchase.types";

/**
 * Shared bits for the live purchase screens - status tones, labels and the
 * money/date rendering conventions the trading register uses.
 */

export const PURCHASE_STATUS_LABEL: Record<PurchaseStatus, string> = {
  [PurchaseStatus.RECORDED]: "Recorded",
  [PurchaseStatus.IN_TRANSIT]: "In transit",
  [PurchaseStatus.RECEIVED]: "Received",
  [PurchaseStatus.VOIDED]: "Voided",
};

export const PURCHASE_STATUS_TONE: Record<PurchaseStatus, Tone> = {
  [PurchaseStatus.RECORDED]: "harvest",
  [PurchaseStatus.IN_TRANSIT]: "sky",
  [PurchaseStatus.RECEIVED]: "leaf",
  [PurchaseStatus.VOIDED]: "slate",
};

/**
 * What each state MEANS to the person reading the register, and what happens
 * next. The word on the chip is short by necessity; this is the sentence it
 * stands for.
 */
export const PURCHASE_STATUS_HELP: Record<PurchaseStatus, string> = {
  [PurchaseStatus.RECORDED]:
    "Bought and written down, but the grain has not reached a warehouse yet.",
  [PurchaseStatus.IN_TRANSIT]:
    "The grain has left the seller and is on its way to your warehouse.",
  [PurchaseStatus.RECEIVED]:
    "The grain arrived and has been added to warehouse stock.",
  [PurchaseStatus.VOIDED]:
    "Cancelled after it was recorded, so it no longer counts towards stock or cost.",
};

export function PurchaseStatusBadge({ status }: { status: PurchaseStatus }) {
  return (
    <HelpWrap text={PURCHASE_STATUS_HELP[status]}>
      <ToneBadge tone={PURCHASE_STATUS_TONE[status]}>
        {PURCHASE_STATUS_LABEL[status]}
      </ToneBadge>
    </HelpWrap>
  );
}

/**
 * The threshold-approval overlay chip: amber while the owner's sign-off is
 * pending, muted once rejected (the cue to void). Renders nothing below the
 * threshold or after approval - an acknowledged purchase needs no extra ink.
 */
export function ApprovalOverlayBadge({
  approval,
}: {
  approval: { status: string } | null;
}) {
  if (approval?.status === "PENDING") {
    return (
      <HelpWrap text="This purchase is big enough to need the owner's sign-off, and is waiting for it.">
        <ToneBadge tone="harvest">Needs approval</ToneBadge>
      </HelpWrap>
    );
  }
  if (approval?.status === "REJECTED") {
    return (
      <HelpWrap text="The owner did not sign this purchase off, so it should be voided.">
        <ToneBadge tone="slate">Approval rejected</ToneBadge>
      </HelpWrap>
    );
  }
  return null;
}

export const PURCHASE_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: PurchaseStatus.RECORDED, label: "Recorded" },
  { value: PurchaseStatus.IN_TRANSIT, label: "In transit" },
  { value: PurchaseStatus.RECEIVED, label: "Received" },
  { value: PurchaseStatus.VOIDED, label: "Voided" },
] as const;

/** GH₵ figure for table cells: compact from a million up (exact in title). */
export function CompactCedis({ amount }: { amount: number | null }) {
  // Null means the API redacted it for this user (financial visibility).
  if (amount === null)
    return <span className="text-adm-faint">{MONEY_HIDDEN}</span>;
  if (Math.abs(amount) < 1_000_000) return <>{formatCedis(amount)}</>;
  return (
    <span title={formatCedis(amount)}>
      {`GH₵ ${(amount / 1_000_000).toLocaleString("en-GH", {
        maximumFractionDigits: 1,
      })}M`}
    </span>
  );
}

/** "05 Jul 2026" - the console's date rendering. */
export function formatConsoleDate(iso: string): string {
  return formatDateTime(iso);
}

/** Who the goods came from, for list rows: supplier, agent, or the source. */
export function purchaseCounterparty(p: {
  agent: { name: string } | null;
  supplier: { name: string } | null;
  source: string;
}): string {
  if (p.agent) return p.agent.name;
  if (p.supplier) return p.supplier.name;
  return p.source === "COMPANY" ? "Company" : "Individual";
}

/** Today as the YYYY-MM-DD a date input wants. */
export function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Whether the supplier has been paid.
 *
 * Kept beside the status badge rather than folded into it: a purchase's
 * LOGISTICS state (recorded, in transit, received) and whether the money has
 * gone out are two different facts, and the system used to hold only the
 * first. The status survives money redaction, so a staff member without
 * financial visibility can still see that somebody is owed.
 */
export function SettlementBadge({
  settlement,
}: {
  settlement: IPurchase["settlement"];
}) {
  if (!settlement) return null;
  if (settlement.status === "PAID") {
    return <ToneBadge tone="forest">Paid</ToneBadge>;
  }
  return settlement.status === "PART_PAID" ? (
    <ToneBadge tone="harvest">Part paid</ToneBadge>
  ) : (
    <ToneBadge tone="alert">Not paid</ToneBadge>
  );
}

/**
 * What one purchase has actually cost, and how its costs were treated.
 *
 * Summed here rather than read off the API on purpose. Every money field on
 * the wire is nullable - the API strips figures for staff without financial
 * visibility - so a total has to inherit that redaction rather than quietly
 * skip the amounts it could not see and present a smaller number under the
 * same label. One hidden figure hides the sum.
 */
export interface IPurchaseCostSummary {
  /** Costs taken into the goods. Null when any of them was redacted. */
  capitalisedGhs: number | null;
  /** The grain plus the costs taken into it - the figure the owner asked for. */
  goodsCostGhs: number | null;
  /** The vouchers that still count: a voided one is not a cost. */
  live: IPurchaseCost[];
  /** Costs attributable to this purchase but left in their own month. */
  monthlyGhs: number | null;
}

/** Cedis to the pesewa: 0.1 + 0.2 in binary floating point is not 0.3. */
const toPesewa = (ghs: number): number => Math.round(ghs * 100) / 100;

const sumGhs = (costs: IPurchaseCost[]): number | null =>
  costs.reduce<number | null>(
    (total, c) =>
      total === null || c.amountGhs === null
        ? null
        : toPesewa(total + c.amountGhs),
    0,
  );

export function summarisePurchaseCosts(
  costs: IPurchaseCost[],
  /** Weight x unit price, as the purchase document states it. */
  totalGhs: number | null,
): IPurchaseCostSummary {
  const live = costs.filter((c) => c.voidedAt === null);
  const capitalisedGhs = sumGhs(live.filter((c) => c.capitalisedAt !== null));
  return {
    capitalisedGhs,
    goodsCostGhs:
      totalGhs === null || capitalisedGhs === null
        ? null
        : toPesewa(totalGhs + capitalisedGhs),
    live,
    monthlyGhs: sumGhs(live.filter((c) => c.capitalisedAt === null)),
  };
}

/**
 * The type size for the landed-cost headline, chosen from how long the figure
 * actually renders.
 *
 * The rail it sits in is 340px however wide the screen is, which leaves about
 * 300px of line - and "GH₵ 1,000,000,000.00" at 26px does not fit in it. A
 * clipped figure is worse than a smaller one: it reads as a DIFFERENT, shorter
 * amount rather than as something cut off.
 */
export function goodsCostValueCls(rendered: string): string {
  if (rendered.length <= 16) return "text-[26px]";
  if (rendered.length <= 20) return "text-[21px]";
  return "text-[17px]";
}
