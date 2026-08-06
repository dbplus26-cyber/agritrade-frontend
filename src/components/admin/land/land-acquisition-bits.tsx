"use client";

import { HelpWrap } from "@/components/admin/help-tip";
import { ToneBadge, type Tone } from "@/components/admin/ui";
import type { LandAcquisitionStatus } from "@/types/land.types";

const ACQUISITION_TONE: Record<
  LandAcquisitionStatus,
  { label: string; tone: Tone }
> = {
  AGREED: { label: "Agreed", tone: "sky" },
  CANCELLED: { label: "Cancelled", tone: "slate" },
  COMPLETED: { label: "Completed", tone: "forest" },
  NEGOTIATING: { label: "Negotiating", tone: "harvest" },
};

/** How far along the buying of this land is, from the seller's side. */
const ACQUISITION_HELP: Record<LandAcquisitionStatus, string> = {
  AGREED:
    "A price is settled with the seller, so payments can be recorded against it.",
  CANCELLED:
    "The purchase was called off; anything already paid stays on the record.",
  COMPLETED: "The seller has been paid in full and the land is yours.",
  NEGOTIATING: "Still agreeing a price with the seller, so nothing is owed yet.",
};

export function LandAcquisitionStatusBadge({
  status,
}: {
  status: LandAcquisitionStatus;
}) {
  const s = ACQUISITION_TONE[status];
  return (
    <HelpWrap text={ACQUISITION_HELP[status]}>
      <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
    </HelpWrap>
  );
}

export const LAND_ACQUISITION_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Negotiating", value: "NEGOTIATING" },
  { label: "Agreed", value: "AGREED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;
