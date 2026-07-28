import type { Metadata } from "next";
import { Suspense } from "react";
import { FarmApplicationsScreen } from "@/components/admin/inbox/farm-applications-screen";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Farm applications" };

/** The farming-programme application queue (super-admin surface). */
export default function FarmApplicationsPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={3} />}>
      <FarmApplicationsScreen />
    </Suspense>
  );
}
