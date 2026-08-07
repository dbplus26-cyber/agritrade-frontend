import type { Metadata } from "next";
import { ShipmentEdit } from "@/components/admin/trading/shipment-edit";

export const metadata: Metadata = { title: "Edit shipment plan" };

export default async function EditShipmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ShipmentEdit id={id} />;
}
