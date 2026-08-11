"use client";

import { MySendsScreen } from "@/components/admin/disbursements/my-sends-screen";
import { usePermissions } from "@/hooks/use-permissions";
import { useGetMyFloatQuery } from "@/redux/agent/agent-api";

/**
 * The field app's send screen. Thin on purpose: it is the same screen a staff
 * member uses in the console, and duplicating it here would guarantee the two
 * drifted. All this adds is the agent's live float, so the dialog can tell
 * them what they have left before they type an amount they cannot cover.
 */
export function AgentSends() {
  const { data } = useGetMyFloatQuery({ limit: 1, page: 1 });
  const { has } = usePermissions();
  return (
    <MySendsScreen
      availableGhs={data?.summary.balanceGhs ?? null}
      // History stays readable when sending is withdrawn - past sends are
      // the agent's own record of work; only the action goes.
      canSend={has("PAYOUTS_SEND")}
      surface="agent"
    />
  );
}
