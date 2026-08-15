import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import { formatCedis, MONEY_HIDDEN } from "@/lib/format-money";
import { type IPurchase, PurchaseStatus } from "@/types/purchase.types";

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
