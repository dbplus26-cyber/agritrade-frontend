import Link from "next/link";
import { HelpWrap } from "@/components/admin/help-tip";
import { adminLinkClass, ToneBadge, type Tone } from "@/components/admin/ui";
import { formatCedis } from "@/lib/format-money";
import { cn } from "@/lib/utils";
import { ApprovalAction, ApprovalStatus } from "@/types/approval.types";

/** Shared bits for the approvals inbox - action/status tones, the uniform
 * card anatomy pieces (stamp, meta strip) and the defensive summary
 * renderer (summary shapes vary by action). */

export const ACTION_LABEL: Record<ApprovalAction, string> = {
  [ApprovalAction.PURCHASE_ABOVE_THRESHOLD]: "Purchase above threshold",
  [ApprovalAction.STOCK_ADJUSTMENT]: "Stock adjustment",
  [ApprovalAction.PUBLISH_TO_WEBSITE]: "Publish to website",
  [ApprovalAction.LOAD_BELOW_MILESTONE]: "Load below milestone",
  [ApprovalAction.INPUT_GRANT_ABOVE_THRESHOLD]: "Input grant above threshold",
};

export const ACTION_TONE: Record<ApprovalAction, Tone> = {
  [ApprovalAction.PURCHASE_ABOVE_THRESHOLD]: "harvest",
  [ApprovalAction.STOCK_ADJUSTMENT]: "sky",
  [ApprovalAction.PUBLISH_TO_WEBSITE]: "leaf",
  [ApprovalAction.LOAD_BELOW_MILESTONE]: "alert",
  [ApprovalAction.INPUT_GRANT_ABOVE_THRESHOLD]: "harvest",
};

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: "Pending",
  [ApprovalStatus.APPROVED]: "Approved",
  [ApprovalStatus.REJECTED]: "Rejected",
};

export const APPROVAL_STATUS_TONE: Record<ApprovalStatus, Tone> = {
  [ApprovalStatus.PENDING]: "harvest",
  [ApprovalStatus.APPROVED]: "leaf",
  [ApprovalStatus.REJECTED]: "slate",
};

/** What kind of decision each request is actually asking for. */
export const ACTION_HELP: Record<ApprovalAction, string> = {
  [ApprovalAction.PURCHASE_ABOVE_THRESHOLD]:
    "Somebody bought grain for more than staff are allowed to spend without you.",
  [ApprovalAction.STOCK_ADJUSTMENT]:
    "Somebody wants to correct warehouse stock outside a purchase, sale or transfer.",
  [ApprovalAction.PUBLISH_TO_WEBSITE]:
    "Somebody wants to show this on the public website where customers can see it.",
  [ApprovalAction.LOAD_BELOW_MILESTONE]:
    "Somebody wants to load a truck before the buyer has paid what the terms require.",
  [ApprovalAction.INPUT_GRANT_ABOVE_THRESHOLD]:
    "Somebody advanced a farmer more in seed, fertiliser or tools than staff may give without you.",
};

export const APPROVAL_STATUS_HELP: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]:
    "Waiting on a decision; nothing changes until somebody approves or rejects it.",
  [ApprovalStatus.APPROVED]:
    "Agreed, and the change it asked for has already been applied.",
  [ApprovalStatus.REJECTED]:
    "Turned down, so the change was not applied and the record stands as it was.",
};

export function ActionBadge({ action }: { action: ApprovalAction }) {
  return (
    <HelpWrap text={ACTION_HELP[action]}>
      <ToneBadge tone={ACTION_TONE[action]}>{ACTION_LABEL[action]}</ToneBadge>
    </HelpWrap>
  );
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <HelpWrap text={APPROVAL_STATUS_HELP[status]}>
      <ToneBadge tone={APPROVAL_STATUS_TONE[status]}>
        {APPROVAL_STATUS_LABEL[status]}
      </ToneBadge>
    </HelpWrap>
  );
}

/**
 * Which module an approval's underlying record belongs to and, when the
 * console has a page for it, where to see the full record. Grants and stock
 * adjustments have no per-record page, so they link to their register views;
 * unknown entity types fall back to the raw type with no link.
 */
export function entityLink(
  entityType: string,
  entityId: string,
): { moduleLabel: string; href: string | null; linkText: string } {
  switch (entityType) {
    case "Purchase":
      return {
        moduleLabel: "Purchases",
        href: `/admin/purchases/${entityId}`,
        linkText: "View the purchase",
      };
    case "InputGrant":
      return {
        moduleLabel: "Farm grants",
        href: `/admin/grants/${entityId}`,
        linkText: "View the grant",
      };
    case "Commodity":
      return {
        moduleLabel: "Commodities",
        href: `/admin/commodities/${entityId}`,
        linkText: "View the commodity",
      };
    case "LandPlot":
      return {
        moduleLabel: "Land",
        href: `/admin/plots/${entityId}`,
        linkText: "View the plot",
      };
    case "Shipment":
      return {
        moduleLabel: "Shipments",
        href: `/admin/shipments/${entityId}`,
        linkText: "View the shipment",
      };
    case "StockAdjustment":
      // Adjustments have no per-id page - the stock view is where they land.
      return {
        moduleLabel: "Stock",
        href: "/admin/stock",
        linkText: "View stock",
      };
    default:
      return { moduleLabel: entityType, href: null, linkText: "" };
  }
}

/**
 * Human age of a pending request ("3 days waiting", "2 hours waiting") so
 * the inbox shows what has been sitting. Coarse on purpose - no seconds, no
 * live ticking.
 */
export function waitingFor(createdAtIso: string): string {
  const ms = Date.now() - new Date(createdAtIso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return "just arrived";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} waiting`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} waiting`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} waiting`;
}

/** The anatomy's micro-label - meta rows and the note heading. */
export const stencilCls =
  "text-[11px] font-bold uppercase tracking-[0.08em] text-adm-muted/80";

/**
 * Compact card timestamp, "12 Jul, 14:30". The year appears only when it is
 * not the current one - decided requests can be old, and "12 Jul" alone
 * would silently read as this year.
 */
export function approvalStamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    ...(d.getFullYear() === new Date().getFullYear()
      ? {}
      : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Zone 3 of the card anatomy: the bordered-top mini-table of provenance
 * rows. Every card renders the same rows in the same order (with an absent
 * placeholder rather than omitting one) so cards line up in the grid.
 */
export function MetaStrip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("border-t border-adm-hairline pt-1.5", className)}>
      {children}
    </div>
  );
}

/** One meta-strip row: label left, 12px value right. */
export function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-[3px]">
      <span className={cn("flex-none", stencilCls)}>{label}</span>
      <span className="min-w-0 text-right text-[12px] text-adm-ink [overflow-wrap:anywhere]">
        {children}
      </span>
    </div>
  );
}

/**
 * The meta strip's "From" value: module label plus the entity deep link.
 * Cards use the terse "View ->"; the detail page passes `verbose` for the
 * full "View the purchase ->" wording.
 */
export function ModuleValue({
  entityType,
  entityId,
  verbose = false,
}: {
  entityType: string;
  entityId: string;
  verbose?: boolean;
}) {
  const link = entityLink(entityType, entityId);
  return (
    <>
      {link.moduleLabel}
      {link.href ? (
        <>
          {" · "}
          <Link
            href={link.href}
            className={cn(adminLinkClass, "font-semibold whitespace-nowrap")}
          >
            {verbose ? link.linkText : "View"} {"->"}
          </Link>
        </>
      ) : null}
    </>
  );
}

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

/**
 * Renders the request's display snapshot human-first. Shapes by action:
 * purchases carry { totalGhs, commodityName, source }; stock adjustments
 * { commodityName, warehouseName, deltaKg, reason }. Anything missing
 * degrades to whatever fields exist - never a crash on an old snapshot.
 */
export function summaryLine(
  action: ApprovalAction,
  summary: unknown,
): { headline: string; detail: string | null } {
  const s = asRecord(summary);
  if (action === ApprovalAction.PURCHASE_ABOVE_THRESHOLD) {
    const total = num(s.totalGhs);
    const commodity = str(s.commodityName);
    const source = str(s.source);
    return {
      headline: total !== null ? formatCedis(total) : "Purchase",
      detail: [
        commodity ? `${commodity} purchase` : null,
        source ? `${source.toLowerCase()}-sourced` : null,
      ]
        .filter(Boolean)
        .join(", ") || null,
    };
  }
  if (action === ApprovalAction.STOCK_ADJUSTMENT) {
    const delta = num(s.deltaKg);
    const commodity = str(s.commodityName);
    const warehouse = str(s.warehouseName);
    const signed =
      delta !== null
        ? `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-GH")} kg`
        : "Adjustment";
    return {
      headline: [signed, commodity].filter(Boolean).join(" "),
      detail:
        [warehouse ? `at ${warehouse}` : null, str(s.reason)]
          .filter(Boolean)
          .join(" - ") || null,
    };
  }
  if (action === ApprovalAction.INPUT_GRANT_ABOVE_THRESHOLD) {
    const value = num(s.valueGhs) ?? num(s.amountGhs);
    return {
      headline: value !== null ? formatCedis(value) : "Input grant",
      detail:
        [str(s.itemName), str(s.farmerName)].filter(Boolean).join(" - ") || null,
    };
  }
  if (action === ApprovalAction.LOAD_BELOW_MILESTONE) {
    // Snapshot shape: { buyerName, requiredBeforeLoadingGhs, truckReg }.
    const required = num(s.requiredBeforeLoadingGhs);
    const truck = str(s.truckReg);
    return {
      headline: str(s.buyerName) ?? "Load below milestone",
      detail:
        [
          truck ? `Truck ${truck}` : null,
          required !== null
            ? `needs ${formatCedis(required)} before loading`
            : null,
        ]
          .filter(Boolean)
          .join(" - ") || null,
    };
  }
  if (action === ApprovalAction.PUBLISH_TO_WEBSITE) {
    return {
      headline: str(s.commodityName) ?? str(s.reference) ?? "Publish to website",
      detail: str(s.reason),
    };
  }
  // Unknown/future action: never crash - fall back to the action label.
  return { headline: ACTION_LABEL[action] ?? "Approval", detail: str(s.reason) };
}
