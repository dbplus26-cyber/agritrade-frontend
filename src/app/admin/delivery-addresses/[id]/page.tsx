import type { Metadata } from "next";
import { DeliveryAddressEdit } from "@/components/admin/logistics/delivery-address-screens";

export const metadata: Metadata = { title: "Delivery address" };

export default async function DeliveryAddressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DeliveryAddressEdit id={id} />;
}
