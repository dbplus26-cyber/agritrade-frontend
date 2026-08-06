import type { Metadata } from "next";
import { DriverPoliciesScreen } from "@/components/admin/drivers/driver-policies-screen";

export const metadata: Metadata = { title: "Driver Payment Policies" };

export default function DriverPaymentPoliciesPage() {
  return <DriverPoliciesScreen />;
}
