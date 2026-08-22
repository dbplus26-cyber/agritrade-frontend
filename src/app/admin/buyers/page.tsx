import type { Metadata } from "next";
import { Suspense } from "react";
import { BuyerTable } from "@/components/admin/registry/buyer-screens";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Buyers" };

/** The live Buyers directory. */
export default function BuyersPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={3} />}>
      <BuyerTable />
    </Suspense>
  );
}
