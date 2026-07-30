import type { Metadata } from "next";
import { DisbursementsScreen } from "@/components/admin/disbursements/disbursements-screen";

export const metadata: Metadata = { title: "Money sent" };

export default function DisbursementsPage() {
  return <DisbursementsScreen />;
}
