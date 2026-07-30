import type { Metadata } from "next";
import { PaymentAccountEdit } from "@/components/admin/settings/payment-account-screens";

export const metadata: Metadata = { title: "Edit payment account" };

export default async function PaymentAccountEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentAccountEdit id={id} />;
}
