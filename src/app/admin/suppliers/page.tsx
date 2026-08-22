import type { Metadata } from "next";
import { Suspense } from "react";
import { SupplierTable } from "@/components/admin/registry/supplier-screens";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Suppliers" };

/** The live Suppliers directory. */
export default function SuppliersPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={3} />}>
      <SupplierTable />
    </Suspense>
  );
}
