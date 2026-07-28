import type { Metadata } from "next";
import { Suspense } from "react";
import { CommodityTable } from "@/components/admin/registry/commodity-table";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Commodities" };

/** The live Commodities register - this static route wins over the
 * config-driven `[register]` template. Suspense satisfies useSearchParams
 * (the URL-synced table state) during static prerender. */
export default function CommoditiesPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={2} />}>
      <CommodityTable />
    </Suspense>
  );
}
