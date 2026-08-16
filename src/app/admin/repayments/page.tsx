import type { Metadata } from "next";
import { RepaymentsRegister } from "@/components/admin/farm/repayments-register";

export const metadata: Metadata = { title: "Repayments" };

export default function RepaymentsPage() {
  return <RepaymentsRegister />;
}
