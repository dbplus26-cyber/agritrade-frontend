import type { Metadata } from "next";
import { PaymentAccountDetail } from "@/components/admin/settings/payment-account-detail";

export const metadata: Metadata = { title: "Payment account" };

export default async function PaymentAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentAccountDetail id={id} />;
}
