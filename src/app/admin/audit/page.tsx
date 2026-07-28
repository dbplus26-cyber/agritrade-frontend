import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditTable } from "@/components/admin/audit/audit-table";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Audit Log" };

/** The live audit register — this static route wins over the config-driven
 * `[register]` template (the stub `audit` entry is retired). Suspense
 * satisfies useSearchParams (URL-synced table state) during prerender. */
export default function AuditPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={6} filters={4} />}>
      <AuditTable />
    </Suspense>
  );
}
