import { notFound } from "next/navigation";

/** Catch-all for mistyped agent-console URLs - see the admin twin. */
export default function MissingAgentPage() {
  notFound();
}
