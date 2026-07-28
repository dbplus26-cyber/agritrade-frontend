import type { Metadata } from "next";
import { Suspense } from "react";
import { FarmApplicationsScreen } from "@/components/admin/inbox/farm-applications-screen";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";

export const metadata: Metadata = { title: "Farm applications" };

/** The farming-programme application queue (super-admin surface). */
export default function FarmApplicationsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <FarmApplicationsScreen />
    </Suspense>
  );
}
