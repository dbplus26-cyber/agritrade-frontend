"use client";

import { useAuthRole } from "@/hooks/use-auth-role";
import { usePermissions } from "@/hooks/use-permissions";
import { useGetPendingApprovalsCountQuery } from "@/redux/approvals/approvals-api";

/**
 * The live pending-approvals count behind the sidebar and mobile-tab badges.
 * Polls every 60s so a request made on another device surfaces without a
 * reload; decisions in this tab invalidate the tag and refresh immediately.
 * Errors render as no badge (zero) - a broken badge must never block nav.
 *
 * Someone who cannot DECIDE approvals has no badge and no poll: their nav
 * does not carry the entry, and a count of work they cannot touch is noise.
 */
export function usePendingApprovalsCount(): number {
  const { isSuperAdmin } = useAuthRole();
  const { has } = usePermissions();
  const decider = isSuperAdmin || has("APPROVALS_DECIDE");
  const { data } = useGetPendingApprovalsCountQuery(undefined, {
    pollingInterval: 60_000,
    skip: !decider,
  });
  return decider ? (data?.data.pending ?? 0) : 0;
}
