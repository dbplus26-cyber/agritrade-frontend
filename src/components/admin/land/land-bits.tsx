"use client";

import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import type { LandSaleStatus, PlotStatus } from "@/types/land.types";

const PLOT_TONE: Record<PlotStatus, { label: string; tone: Tone }> = {
  ARCHIVED: { label: "Archived", tone: "slate" },
  AVAILABLE: { label: "Available", tone: "leaf" },
  RESERVED: { label: "Reserved", tone: "harvest" },
  SOLD: { label: "Sold", tone: "forest" },
};

export function PlotStatusBadge({ status }: { status: PlotStatus }) {
  const s = PLOT_TONE[status];
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}

const SALE_TONE: Record<LandSaleStatus, { label: string; tone: Tone }> = {
  CANCELLED: { label: "Cancelled", tone: "slate" },
  COMPLETED: { label: "Completed", tone: "forest" },
  CONFIRMED: { label: "Confirmed", tone: "sky" },
  DRAFT: { label: "Draft", tone: "harvest" },
};

export function LandSaleStatusBadge({ status }: { status: LandSaleStatus }) {
  const s = SALE_TONE[status];
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
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
