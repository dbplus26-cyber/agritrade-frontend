import type { Metadata } from "next";
import { RepaymentDetail } from "@/components/admin/farm/repayment-detail";

export const metadata: Metadata = { title: "Repayment" };

export default async function RepaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <RepaymentDetail id={id} />;
}
