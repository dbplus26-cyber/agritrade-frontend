import type { Metadata } from "next";
import { ShipmentAllocate } from "@/components/admin/trading/shipment-allocate";

export const metadata: Metadata = { title: "Allocate lots" };

export default async function AllocateShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShipmentAllocate id={id} />;
}
