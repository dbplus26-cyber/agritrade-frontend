import type { Metadata } from "next";
import { AgentExpenseForm } from "@/components/agent/agent-expense-form";
import { AgentPermissionGate } from "@/components/agent/agent-permission-gate";

export const metadata: Metadata = {
  title: "Record expense",
  description: "Record a field expense paid from your float.",
};

export default function AgentNewExpensePage() {
  return (
    <AgentPermissionGate permission="EXPENSES_RECORD">
      <div>
        <h1 className="mb-1 text-[18px] font-bold text-ink">Record expense</h1>
        <p className="mb-3.5 text-[12.5px] text-soil">
          Porters, offloading, and other costs you paid from the float.
        </p>
        <AgentExpenseForm />
      </div>
    </AgentPermissionGate>
  );
}
