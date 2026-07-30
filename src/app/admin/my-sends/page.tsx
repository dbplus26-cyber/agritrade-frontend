import type { Metadata } from "next";
import { MySendsScreen } from "@/components/admin/disbursements/my-sends-screen";

export const metadata: Metadata = { title: "My sends" };

/**
 * A staff member's own sends. The owner's whole register lives at
 * /admin/disbursements; this is deliberately the narrower question.
 */
export default function MySendsPage() {
  return <MySendsScreen surface="staff" />;
}
