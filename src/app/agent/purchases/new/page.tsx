import type { Metadata } from "next";
import { AgentPermissionGate } from "@/components/agent/agent-permission-gate";
import { AgentPurchaseForm } from "@/components/agent/agent-purchase-form";

export const metadata: Metadata = {
  title: "Record purchase",
  description: "Record goods you weighed and paid for at the village.",
};

export default function AgentNewPurchasePage() {
  return (
    <AgentPermissionGate permission="PURCHASES_RECORD">
      <div>
        <h1 className="mb-1 text-[18px] font-bold text-ink">Record purchase</h1>
        <p className="mb-3.5 text-[12.5px] text-soil">
          What you weighed and paid for. This charges your float the moment it
          saves.
        </p>
        <AgentPurchaseForm />
      </div>
    </AgentPermissionGate>
  );
}
