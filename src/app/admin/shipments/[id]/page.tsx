import type { Metadata } from "next";
import { ShipmentDetail } from "@/components/admin/trading/shipment-detail";

export const metadata: Metadata = { title: "Shipment" };

export default async function ShipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShipmentDetail id={id} />;
}
