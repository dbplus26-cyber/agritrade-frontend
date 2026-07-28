import type { Metadata } from "next";
import { Suspense } from "react";
import { EnquiriesScreen } from "@/components/admin/inbox/enquiries-screen";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Enquiries" };

/** The website contact-form queue. */
export default function EnquiriesPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={3} />}>
      <EnquiriesScreen />
    </Suspense>
  );
}
