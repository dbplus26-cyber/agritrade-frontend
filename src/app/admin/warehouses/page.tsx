import type { Metadata } from "next";
import { Suspense } from "react";
import { WarehouseTable } from "@/components/admin/registry/warehouse-screens";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Warehouses" };

export default function WarehousesPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={4} filters={1} />}>
      <WarehouseTable />
    </Suspense>
  );
}
