import type { Metadata } from "next";
import { PaymentAccountCreate } from "@/components/admin/settings/payment-account-screens";

export const metadata: Metadata = { title: "Add payment account" };

export default function NewPaymentAccountPage() {
  return <PaymentAccountCreate />;
}
