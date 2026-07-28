import type { Metadata } from "next";
import { TransfersScreen } from "@/components/admin/stock/transfers-screen";

export const metadata: Metadata = { title: "Transfers" };

export default function TransfersPage() {
  return <TransfersScreen />;
}
