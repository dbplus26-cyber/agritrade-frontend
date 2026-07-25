"use client";

import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import type { ShipmentStatus } from "@/types/admin-shipment.types";

const SHIPMENT_STATUS: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  ARRIVED: { label: "Arrived", tone: "leaf" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
  CLOSED: { label: "Closed", tone: "forest" },
  DISPATCHED: { label: "On the road", tone: "sky" },
  LOADING: { label: "Loading", tone: "harvest" },
  PLANNED: { label: "Planned", tone: "harvest" },
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const s = SHIPMENT_STATUS[status];
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}

export const SHIPMENT_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Planned", value: "PLANNED" },
  { label: "Loading", value: "LOADING" },
  { label: "On the road", value: "DISPATCHED" },
  { label: "Arrived", value: "ARRIVED" },
  { label: "Closed", value: "CLOSED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;

/** An ESTIMATED cost basis is flagged so precision loss is visible (5.4). */
export function CostBasisBadge({ basis }: { basis: string }) {
  if (basis !== "ESTIMATED") return null;
  return <ToneBadge tone="harvest">Estimated cost</ToneBadge>;
}

export function formatShipmentDate(iso: string): string {
  return formatDateTime(iso);
}
