import type { Metadata } from "next";
import { PaymentAccountEdit } from "@/components/admin/settings/payment-account-screens";

export const metadata: Metadata = { title: "Payment account" };

export default async function PaymentAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentAccountEdit id={id} />;
}
