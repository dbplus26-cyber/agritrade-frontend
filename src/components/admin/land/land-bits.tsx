"use client";

import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import type { LandSaleStatus, PlotStatus } from "@/types/land.types";

const PLOT_TONE: Record<PlotStatus, { label: string; tone: Tone }> = {
  ARCHIVED: { label: "Archived", tone: "slate" },
  AVAILABLE: { label: "Available", tone: "leaf" },
  RESERVED: { label: "Reserved", tone: "harvest" },
  SOLD: { label: "Sold", tone: "forest" },
};

/** Whether the plot is yours to sell, and to whom. */
const PLOT_HELP: Record<PlotStatus, string> = {
  ARCHIVED: "Taken off the working list and kept only for the record.",
  AVAILABLE: "On your books and free to sell to a buyer.",
  RESERVED:
    "Held for one buyer while their sale is agreed, so it is off the market.",
  SOLD: "Sold and handed over, so it is no longer yours to sell.",
};

export function PlotStatusBadge({ status }: { status: PlotStatus }) {
  const s = PLOT_TONE[status];
  return (
    <HelpWrap text={PLOT_HELP[status]}>
      <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
    </HelpWrap>
  );
}

const SALE_TONE: Record<LandSaleStatus, { label: string; tone: Tone }> = {
  CANCELLED: { label: "Cancelled", tone: "slate" },
  COMPLETED: { label: "Completed", tone: "forest" },
  CONFIRMED: { label: "Confirmed", tone: "sky" },
  DRAFT: { label: "Draft", tone: "harvest" },
};

const LAND_SALE_HELP: Record<LandSaleStatus, string> = {
  CANCELLED: "Called off, and the plot goes back on the market.",
  COMPLETED: "Paid in full and handed over, so nothing is left owing.",
  CONFIRMED:
    "Agreed with the buyer: the plot is held for them while they pay it off.",
  DRAFT: "Still being put together, so the plot is not committed to anyone yet.",
};

export function LandSaleStatusBadge({ status }: { status: LandSaleStatus }) {
  const s = SALE_TONE[status];
  return (
    <HelpWrap text={LAND_SALE_HELP[status]}>
      <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
    </HelpWrap>
  );
}

export const PLOT_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Reserved", value: "RESERVED" },
  { label: "Sold", value: "SOLD" },
  { label: "Archived", value: "ARCHIVED" },
] as const;

export const LAND_SALE_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Draft", value: "DRAFT" },
  { label: "Confirmed", value: "CONFIRMED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

export function formatLandDate(iso: string): string {
  return formatDateTime(iso);
}
