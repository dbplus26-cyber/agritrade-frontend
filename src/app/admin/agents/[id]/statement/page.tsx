import type { Metadata } from "next";
import { AgentStatement } from "@/components/admin/agents/agent-statement";

export const metadata: Metadata = { title: "Float statement" };

export default async function AgentStatementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AgentStatement id={id} />;
}
