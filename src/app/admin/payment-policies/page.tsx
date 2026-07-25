import type { Metadata } from "next";
import { PaymentPoliciesScreen } from "@/components/admin/trading/payment-policies-screen";

export const metadata: Metadata = { title: "Payment Policies" };

export default function PaymentPoliciesPage() {
  return <PaymentPoliciesScreen />;
}
