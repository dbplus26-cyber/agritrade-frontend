import type { Metadata } from "next";
import { TreasuryScreen } from "@/components/admin/treasury/treasury-screen";

export const metadata: Metadata = { title: "Company account" };

export default function TreasuryPage() {
  return <TreasuryScreen />;
}
