import type { Metadata } from "next";
import { Suspense } from "react";
import { DriverTable } from "@/components/admin/logistics/driver-screens";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Drivers" };

/** The drivers directory shipments pull their driver snapshots from. */
export default function DriversPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={3} />}>
      <DriverTable />
    </Suspense>
  );
}
