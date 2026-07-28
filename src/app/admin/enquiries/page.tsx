import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiriesScreen } from "@/components/admin/inbox/enquiries-screen";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";

export const metadata: Metadata = { title: "Enquiries" };

/** The website contact-form queue. */
export default function EnquiriesPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <EnquiriesScreen />
    </Suspense>
  );
}
