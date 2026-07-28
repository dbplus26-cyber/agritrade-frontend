import type { Metadata } from "next";
import { DeliveryAddressCreate } from "@/components/admin/logistics/delivery-address-screens";

export const metadata: Metadata = { title: "Add delivery address" };

export default function NewDeliveryAddressPage() {
  return <DeliveryAddressCreate />;
}
