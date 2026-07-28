import type { Metadata } from "next";
import { Suspense } from "react";
import { DriverTable } from "@/components/admin/logistics/driver-screens";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";

export const metadata: Metadata = { title: "Drivers" };

/** The drivers directory shipments pull their driver snapshots from. */
export default function DriversPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <DriverTable />
    </Suspense>
  );
}
