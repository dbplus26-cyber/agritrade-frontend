import type { Metadata } from "next";
import { AgentProfile } from "@/components/agent/agent-profile";

export const metadata: Metadata = {
  title: "My profile",
  description: "Your details, your password, and what your account can do.",
};

export default function AgentProfilePage() {
  return <AgentProfile />;
}
