import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditTable } from "@/components/admin/audit/audit-table";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Audit Log" };

/** The audit register. Suspense satisfies useSearchParams (URL-synced table
 * state) during prerender. */
export default function AuditPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={6} filters={4} />}>
      <AuditTable />
    </Suspense>
  );
}
