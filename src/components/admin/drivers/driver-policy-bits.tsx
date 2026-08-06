"use client";

import type { DriverMilestoneTrigger } from "@/types/driver-settlement.types";

/**
 * Shared vocabulary for driver settlement.
 *
 * Kept apart from the sale side's sale-bits.ts on purpose. The two milestone
 * enums look interchangeable and are not: a haulier is paid against loading
 * and delivery, a buyer pays against a deposit and the truck's arrival. One
 * shared label map would eventually put "Before loading" in front of somebody
 * choosing when to pay a driver.
 */
const TRIGGER_LABEL: Record<DriverMilestoneTrigger, string> = {
  AT_LOADING: "At loading",
  ON_DELIVERY: "On delivery",
  ON_DEMAND: "On demand",
};

export const driverTriggerLabel = (t: DriverMilestoneTrigger): string =>
  TRIGGER_LABEL[t];

/** What each trigger actually means, for the help tooltips. */
export const DRIVER_TRIGGER_HINT: Record<DriverMilestoneTrigger, string> = {
  AT_LOADING: "Due once the truck is loaded, usually the driver's fuel advance.",
  ON_DELIVERY: "Due once the goods are signed for at the destination.",
  ON_DEMAND: "No fixed point. Settled whenever, against an invoice.",
};

export const DRIVER_TRIGGER_OPTIONS: {
  label: string;
  value: DriverMilestoneTrigger;
}[] = [
  { label: "At loading", value: "AT_LOADING" },
  { label: "On delivery", value: "ON_DELIVERY" },
  { label: "On demand", value: "ON_DEMAND" },
];

/**
 * The split bar's segments, in order.
 *
 * One hue stepped down in weight rather than a set of different colours: the
 * milestones are shares of the same fee, not separate categories, and giving
 * them four hues would say otherwise. Descending weight also matches how a
 * schedule is read - the first call on the money lands darkest.
 */
export const SEGMENT_TONES = [
  "bg-console",
  "bg-console/70",
  "bg-console/50",
  "bg-console/35",
  "bg-console/25",
];

/**
 * How settled a trip is, as something a reader can act on.
 *
 * UNPRICED is the one that earns its place: a trip nobody has agreed a fee for
 * owes an unknown amount, which is not the same as owing nothing, and a
 * console that showed it as settled would quietly drop it off the list of
 * people waiting to be paid.
 */
export const SETTLEMENT_TONE = {
  PART_PAID: { label: "Part paid", tone: "harvest" },
  SETTLED: { label: "Settled", tone: "forest" },
  UNPAID: { label: "Not paid", tone: "alert" },
  UNPRICED: { label: "No fee agreed", tone: "slate" },
} as const;

export const SETTLEMENT_HINT: Record<string, string> = {
  PART_PAID: "Some of the agreed fee has been paid; the rest is still owed.",
  SETTLED: "The driver has been paid everything agreed for this trip.",
  UNPAID: "The fee is agreed but nothing has been paid to the driver yet.",
  UNPRICED:
    "Nobody has agreed what this trip pays yet, so what is owed is unknown.",
};
