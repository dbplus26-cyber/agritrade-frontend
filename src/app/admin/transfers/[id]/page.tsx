import type { Metadata } from "next";
import { TransferDetail } from "@/components/admin/stock/transfer-detail";

export const metadata: Metadata = { title: "Transfer" };

export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TransferDetail id={id} />;
}
