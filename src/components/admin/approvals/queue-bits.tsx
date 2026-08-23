"use client";

import {
  formatCedis,
  formatCedisCompact,
  MONEY_HIDDEN,
} from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { ApprovalAction, ApprovalStatus, type IApproval } from "@/types/approval.types";

/**
 * Shared vocabulary for the approvals queue: the page's scoped design tokens,
 * the status rail, the rule badge, the overage meter and the small
 * formatters. Everything here is specific to /admin/approvals - the rest of
 * the console keeps its own palette untouched.
 */

/**
 * The queue's palette, declared as CSS custom properties on the page
 * wrapper rather than in globals.css.
 *
 * Why scoped: these values are CLOSE to the console's existing pale-husk
 * tokens but not identical (--paper #f2f1ec vs the console's #eff1e8,
 * --forest #14513c vs #155744). Overriding the global names would shift every
 * other screen by a hair for no reason. Under a `--ap-` prefix on one wrapper
 * they cascade to this page and nothing else, and the two systems can differ
 * without either being "wrong".
 */
type CssVars = React.CSSProperties & Record<`--${string}`, string>;

export const APPROVAL_TOKENS: CssVars = {
  // Meridian neutrals. The names are this module's own (its rails and chips
  // are built on them); the values are the console system's, so the queue does
  // not read as a different product from every other screen.
  "--ap-paper": "#fafaf8",
  "--ap-surface": "#ffffff",
  "--ap-surface-alt": "#f5f7f9",
  "--ap-ink": "#161c24",
  "--ap-ink-2": "#39424f",
  "--ap-muted": "#6a7686",
  "--ap-hair": "#e1e6ec",
  "--ap-hair-soft": "#eceff3",
  "--ap-forest": "#1e3d2b",
  "--ap-forest-hover": "#3e7a50",
  "--ap-forest-soft": "#e8f2ea",
  "--ap-amber": "#b8860b",
  "--ap-amber-soft": "#f7eed8",
  "--ap-clay": "#b03a2e",
  "--ap-clay-soft": "#f8e9e7",
  "--ap-leaf": "#2f5e3d",
  "--ap-leaf-soft": "#e8f2ea",
  "--ap-track": "#eceff3",
  "--ap-track-base": "#cfd6df",
  "--ap-chevron": "#9ba6b3",
  "--ap-tabs": "#eceff3",
  "--ap-pill": "#cfd6df",
  "--ap-link-rule": "#cfd6df",
  "--ap-chip": "#f5f7f9",
};

/** Status to rail colour. Absolute - it must never vary by view or filter. */
export const RAIL: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: "var(--ap-amber)",
  [ApprovalStatus.APPROVED]: "var(--ap-leaf)",
  [ApprovalStatus.REJECTED]: "var(--ap-clay)",
};

/** The outcome word in column 6 - the a11y fallback for the rail colour. */
export const OUTCOME: Record<ApprovalStatus, { colour: string; word: string }> = {
  [ApprovalStatus.PENDING]: { colour: "var(--ap-amber)", word: "Pending" },
  [ApprovalStatus.APPROVED]: { colour: "var(--ap-leaf)", word: "Approved" },
  [ApprovalStatus.REJECTED]: { colour: "var(--ap-clay)", word: "Rejected" },
};

interface RuleStyle {
  bg: string;
  fg: string;
  label: string;
}

/**
 * The rule badge. Labels are deliberately shorter than the action names -
 * the subject column already says what kind of record this is, so the badge
 * only has to say which rule caught it.
 */
const RULE: Record<ApprovalAction, RuleStyle> = {
  [ApprovalAction.PURCHASE_ABOVE_THRESHOLD]: {
    bg: "var(--ap-amber-soft)",
    fg: "var(--ap-amber)",
    label: "Above limit",
  },
  [ApprovalAction.INPUT_GRANT_ABOVE_THRESHOLD]: {
    bg: "var(--ap-amber-soft)",
    fg: "var(--ap-amber)",
    label: "Grant above limit",
  },
  [ApprovalAction.STOCK_ADJUSTMENT]: {
    bg: "#e9eef4",
    fg: "#3a5a7d",
    label: "Stock adjustment",
  },
  [ApprovalAction.LOAD_BELOW_MILESTONE]: {
    bg: "#f0ecf5",
    fg: "#5b4a7d",
    label: "Below milestone",
  },
  // Publishing is not a limit breach at all. It gets the neutral husk chip so
  // the three coloured variants keep meaning "a rule fired".
  [ApprovalAction.PUBLISH_TO_WEBSITE]: {
    bg: "var(--ap-chip)",
    fg: "var(--ap-ink-2)",
    label: "Publish to website",
  },
};

export function RuleBadge({ action }: { action: ApprovalAction }) {
  const rule = RULE[action];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-none px-[9px] py-[3px] text-[10.5px] leading-[1.4] font-[550] whitespace-nowrap"
      style={{ backgroundColor: rule.bg, color: rule.fg }}
    >
      <span
        aria-hidden="true"
        className="size-[5px] shrink-0 rounded-full bg-current"
      />
      {rule.label}
    </span>
  );
}

/** Rules whose figure is money, so a null amount means "redacted", not "none". */
const MONETARY = new Set<ApprovalAction>([
  ApprovalAction.PURCHASE_ABOVE_THRESHOLD,
  ApprovalAction.INPUT_GRANT_ABOVE_THRESHOLD,
]);

/**
 * The headline figure. A stock adjustment has no money at all and leads with
 * its signed quantity; a monetary rule with a null amount was REDACTED and
 * must say so, because "hidden from this reader" and "there is none" are
 * different facts and a ledger may not blur them.
 */
export function headlineFigure(a: IApproval): string {
  // Compact at scale: the queue cell is ~130px on a phone, and a full
  // eight-figure amount breaks mid-number across two lines - the one way a
  // money figure must never fail. The expanded panel prints it exactly.
  if (a.amount !== null) return formatCedisCompact(a.amount);
  if (a.quantityLabel) return a.quantityLabel;
  return MONETARY.has(a.action) ? MONEY_HIDDEN : "-";
}

/** What sits under the headline: the sublabel naming what the figure is. */
export function headlineSublabel(a: IApproval): string | null {
  if (a.amount !== null || MONETARY.has(a.action)) return null;
  if (a.quantityLabel) return "Quantity change";
  return null;
}

/** True when there is a real breach to draw: both figures known, one over. */
export function hasOverage(a: IApproval): boolean {
  return a.amount !== null && a.limit !== null && a.amount > a.limit;
}

/** "GH₵ 5,000.00 over the GH₵ 10,000.00 limit, 50% above" */
export function overageSentence(a: IApproval): string | null {
  if (!hasOverage(a) || a.amount === null || a.limit === null) return null;
  const over = a.amount - a.limit;
  const pct = Math.round((over / a.limit) * 100);
  return `${formatCedis(over)} over the ${formatCedis(a.limit)} limit, ${pct}% above`;
}

/**
 * The signature element: a 4px bar split into the part that was within the
 * limit and the part that was not. Rendered ONLY when both figures exist and
 * the amount is over - an empty or all-grey meter would say nothing, and its
 * absence is meaningful on its own.
 */
export function OverageMeter({
  approval,
  className,
}: {
  approval: IApproval;
  className?: string;
}) {
  const sentence = overageSentence(approval);
  if (sentence === null || approval.amount === null || approval.limit === null)
    return null;
  const basePct = (approval.limit / approval.amount) * 100;

  return (
    <div
      role="img"
      aria-label={sentence}
      className={cn(
        "flex h-1 w-full max-w-[150px] overflow-hidden rounded-none bg-[var(--ap-track)]",
        className,
      )}
    >
      <span
        className="block h-full bg-[var(--ap-track-base)]"
        style={{ width: `${basePct}%` }}
      />
      <span
        className="block h-full bg-[var(--ap-clay)]"
        style={{ width: `${100 - basePct}%` }}
      />
    </div>
  );
}

/**
 * The subject's supporting line: the facts a decider needs before saying yes.
 * Only what the request-time snapshot actually captured - the API returns
 * null for anything it did not, and an invented figure is worse than a short
 * line.
 */
export function subjectDetailLine(a: IApproval, includeRef = true): string | null {
  const quantityAndPrice =
    a.quantity !== null && a.unit
      ? a.unitPrice !== null
        ? `${a.quantity.toLocaleString("en-GH")} ${a.unit} at ${formatCedis(a.unitPrice)}/${a.unit}`
        : `${a.quantity.toLocaleString("en-GH")} ${a.unit}`
      : null;
  const parts = [
    quantityAndPrice,
    a.counterparty,
    a.subjectDetail,
    // The document number rides the collapsed row, not just the expanded
    // panel: an inbox of three identical GH₵ 15,000 maize purchases is only
    // navigable if the thing that differs is on screen without opening any
    // of them.
    includeRef ? a.sourceRef : null,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * "Nurudeen Abdul-Majeed" -> "Nurudeen A." for the queue's 118px Raised by
 * column and the card meta line. Two full names stacked there push every row
 * ~16px taller, which is the difference between ten items fitting on a screen
 * and eight. The audit trail in the expanded panel keeps the name in full.
 */
export function shortName(name: string | undefined): string {
  if (!name) return "Unknown";
  const [first, ...rest] = name.trim().split(/\s+/);
  const surname = rest.at(-1);
  return surname ? `${first} ${surname.charAt(0)}.` : (first ?? "Unknown");
}

/** "22 Jul, 15:16" - the year only when it is not the current one. */
export function stamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

const RELATIVE = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "narrow",
});

/**
 * "2d ago", "6h ago". `Intl.RelativeTimeFormat` against `Date.now()` is only
 * ever evaluated on the client: the rows it formats arrive from an RTK Query
 * fetch, so no row exists during the server render and there is nothing for
 * the client to disagree with.
 */
export function relativeAge(iso: string): string {
  const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
  if (!Number.isFinite(seconds)) return "";
  const minutes = seconds / 60;
  if (Math.abs(minutes) < 60) return RELATIVE.format(Math.round(minutes), "minute");
  const hours = minutes / 60;
  if (Math.abs(hours) < 24) return RELATIVE.format(Math.round(hours), "hour");
  const days = hours / 24;
  if (Math.abs(days) < 30) return RELATIVE.format(Math.round(days), "day");
  return RELATIVE.format(Math.round(days / 30), "month");
}

/** Pending shows how long it has been waiting; decided shows when. */
export function ageLabel(a: IApproval): string {
  return a.status === ApprovalStatus.PENDING
    ? relativeAge(a.createdAt)
    : stamp(a.createdAt);
}

/** "Purchases · PUR-2026-00418", or just the module when there is no number. */
export function sourceLabel(a: IApproval): string {
  return a.sourceRef ? `${a.sourceModule} · ${a.sourceRef}` : a.sourceModule;
}

/**
 * The audit line under the expanded detail. Reads as one sentence so the
 * whole provenance can be taken in without parsing a table.
 */
export function auditTrail(a: IApproval): string {
  const raised = `Raised ${stamp(a.createdAt)} by ${a.requestedBy?.name ?? "an unknown user"}`;
  if (a.status === ApprovalStatus.PENDING || !a.decidedAt)
    return `${raised} · Awaiting a decision`;
  const self = a.selfDecided ? " (self approved)" : "";
  return `${raised} · Decided ${stamp(a.decidedAt)} by ${a.decidedBy?.name ?? "an unknown user"}${self}`;
}

/** Button styling: base, primary and danger share one shape. */
export const apButton =
  "inline-flex items-center justify-center rounded-none border px-[13px] py-1.5 text-[11px] leading-[1.4] font-[550] whitespace-nowrap cursor-pointer " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ap-forest)] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

export const apButtonBase =
  "border-[var(--ap-hair)] bg-[var(--ap-surface)] text-[var(--ap-ink-2)] " +
  "not-disabled:hover:border-[#cdc9be] not-disabled:hover:bg-[var(--ap-surface-alt)]";

export const apButtonPrimary =
  "border-[var(--ap-forest)] bg-[var(--ap-forest)] text-white " +
  "not-disabled:hover:bg-[var(--ap-forest-hover)]";

export const apButtonDanger =
  "border-[#e3cec8] bg-[var(--ap-surface)] text-[var(--ap-clay)] " +
  "not-disabled:hover:bg-[var(--ap-clay-soft)]";

/** The eyebrow key above a value in the expanded detail and the card. */
export const apFieldKey =
  "text-[10.5px] leading-[1.4] font-[650] tracking-[0.09em] uppercase text-[var(--ap-muted)]";

/** The one link treatment on the page - forest with a hairline underline. */
export const apLink =
  "font-[550] text-[var(--ap-forest)] no-underline border-b border-[var(--ap-link-rule)] hover:border-[var(--ap-forest)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ap-forest)]";

/** The decider's note block, shared by the detail panel and the card. */
export function NoteBlock({ note }: { note: string }) {
  return (
    <div className="mt-3.5 max-w-[70ch] border-l-2 border-[var(--ap-hair)] py-0.5 pl-3">
      <div className={cn(apFieldKey, "mb-[3px]")}>Decider&apos;s note</div>
      <div className="text-[11.5px] leading-[1.5] text-[var(--ap-ink-2)] [overflow-wrap:anywhere]">
        {note}
      </div>
    </div>
  );
}

/** Shown when one account both raised and signed off the same request. */
export function SelfDecidedChip() {
  return (
    <span className="rounded-none bg-[var(--ap-chip)] px-[7px] py-0.5 text-[10.5px] leading-[1.4] font-semibold text-[var(--ap-muted)]">
      Self approved
    </span>
  );
}

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn(
        "size-3.5 justify-self-end text-[var(--ap-chevron)] transition-transform duration-[180ms] ease-out motion-reduce:transition-none",
        open && "rotate-90",
      )}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
