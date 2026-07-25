import type { Metadata } from "next";
import { Waybill } from "@/components/admin/trading/waybill";

export const metadata: Metadata = { title: "Waybill" };

export default async function WaybillPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Waybill id={id} />;
}
