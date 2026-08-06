"use client";

import { HelpWrap } from "@/components/admin/help-tip";
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

/** Where the truck is in its trip, and what the state lets you do next. */
const SHIPMENT_STATUS_HELP: Record<ShipmentStatus, string> = {
  ARRIVED:
    "The truck reached the drop-off point; the delivery still has to be signed off.",
  CANCELLED: "Called off, and anything already loaded goes back to stock.",
  CLOSED: "Delivered and finished with: no further changes are expected.",
  DISPATCHED: "The truck has left the warehouse and is on its way to the buyer.",
  LOADING: "Goods are going onto the truck; it has not left the warehouse yet.",
  PLANNED: "Truck and route are set, but nothing is on board yet.",
};

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const s = SHIPMENT_STATUS[status];
  return (
    <HelpWrap text={SHIPMENT_STATUS_HELP[status]}>
      <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
    </HelpWrap>
  );
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
  return (
    <HelpWrap text="The cost of the goods on board is an estimate, not the settled figure, so profit here can still move.">
      <ToneBadge tone="harvest">Estimated cost</ToneBadge>
    </HelpWrap>
  );
}

export function formatShipmentDate(iso: string): string {
  return formatDateTime(iso);
}
