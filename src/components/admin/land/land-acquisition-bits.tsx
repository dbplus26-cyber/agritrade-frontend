"use client";

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

export function LandAcquisitionStatusBadge({
  status,
}: {
  status: LandAcquisitionStatus;
}) {
  const s = ACQUISITION_TONE[status];
  return <ToneBadge tone={s.tone}>{s.label}</ToneBadge>;
}

export const LAND_ACQUISITION_STATUS_FILTER_OPTIONS = [
  { label: "All statuses", value: "all" },
  { label: "Negotiating", value: "NEGOTIATING" },
  { label: "Agreed", value: "AGREED" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Cancelled", value: "CANCELLED" },
] as const;
