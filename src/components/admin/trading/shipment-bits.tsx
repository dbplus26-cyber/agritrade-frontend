"use client";

import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";
import type { IShipment, ShipmentStatus } from "@/types/admin-shipment.types";

/**
 * Everywhere this truck loads, in the words a person would use: the sheds it
 * calls at, then the sellers it collects from.
 *
 * One helper rather than a line of its own on each screen, because the answer
 * has three shapes - sheds only, farm gates only, or both - and a screen that
 * still reaches for the origin warehouse alone names half the movement, or
 * nothing at all on a trip that never visits a shed.
 */
export function loadingPointsOf(
  shipment: Pick<
    IShipment,
    "loadingWarehouses" | "originWarehouse" | "pickupSuppliers"
  >,
): string[] {
  const sheds =
    shipment.loadingWarehouses.length > 0
      ? shipment.loadingWarehouses.map((w) => w.name)
      : shipment.originWarehouse
        ? [shipment.originWarehouse.name]
        : [];
  return [...sheds, ...shipment.pickupSuppliers.map((p) => p.name)];
}

/** The same list as one phrase, for a sentence or a header line. */
export function loadingFrom(
  shipment: Pick<
    IShipment,
    "loadingWarehouses" | "originWarehouse" | "pickupSuppliers"
  >,
): string {
  const points = loadingPointsOf(shipment);
  return points.length > 0 ? points.join(" and ") : "no loading point yet";
}

const SHIPMENT_STATUS: Record<ShipmentStatus, { label: string; tone: Tone }> = {
  ARRIVED: { label: "Arrived", tone: "leaf" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
  CLOSED: { label: "Closed", tone: "forest" },
  DISPATCHED: { label: "On the road", tone: "sky" },
  LOADING: { label: "Loading", tone: "harvest" },
  PLANNED: { label: "Planned", tone: "harvest" },
};

/** Where the truck is in its trip, and what the state allows next. */
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
