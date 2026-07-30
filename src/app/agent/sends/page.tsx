import type { Metadata } from "next";
import { AgentSends } from "@/components/agent/agent-sends";

export const metadata: Metadata = {
  title: "Send money",
  description: "Money you have sent from your float.",
};

export default function AgentSendsPage() {
  return <AgentSends />;
}
