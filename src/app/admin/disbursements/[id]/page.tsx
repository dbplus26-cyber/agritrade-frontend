import type { Metadata } from "next";
import { DisbursementDetail } from "@/components/admin/disbursements/disbursement-detail";

export const metadata: Metadata = { title: "Payout" };

export default async function DisbursementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DisbursementDetail id={id} />;
}
