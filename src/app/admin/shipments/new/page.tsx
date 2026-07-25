import type { Metadata } from "next";
import { ShipmentForm } from "@/components/admin/trading/shipment-form";

export const metadata: Metadata = { title: "Plan shipment" };

export default async function NewShipmentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const saleId = typeof sp.saleId === "string" ? sp.saleId : undefined;
  return <ShipmentForm saleId={saleId} />;
}
