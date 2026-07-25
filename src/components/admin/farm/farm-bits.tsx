"use client";

import { ToneBadge } from "@/components/admin/ui";
import { formatDateTime } from "@/lib/format-date";

/** "05 Jul 2026" - the console's shared date idiom. */
export function formatFarmDate(iso: string): string {
  return formatDateTime(iso);
}

export const ACTIVE_FILTER_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Active", value: "true" },
  { label: "Inactive", value: "false" },
] as const;

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <ToneBadge tone="leaf">Active</ToneBadge>
  ) : (
    <ToneBadge tone="slate">Inactive</ToneBadge>
  );
}

/**
 * The INPUT_GRANT_ABOVE_THRESHOLD overlay chip: a grant records immediately but
 * is flagged until the owner acknowledges the over-threshold value.
 */
export function GrantApprovalBadge({
  status,
}: {
  status: string | undefined;
}) {
  if (!status) return null;
  if (status === "PENDING")
    return <ToneBadge tone="harvest">Approval pending</ToneBadge>;
  if (status === "APPROVED")
    return <ToneBadge tone="leaf">Acknowledged</ToneBadge>;
  if (status === "REJECTED")
    return <ToneBadge tone="alert">Rejected</ToneBadge>;
  return <ToneBadge tone="slate">{status}</ToneBadge>;
}
