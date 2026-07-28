import type { Metadata } from "next";
import { Suspense } from "react";
import { DeliveryAddressTable } from "@/components/admin/logistics/delivery-address-screens";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Delivery addresses" };

/** The saved destinations shipments deliver to. */
export default function DeliveryAddressesPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={3} />}>
      <DeliveryAddressTable />
    </Suspense>
  );
}
