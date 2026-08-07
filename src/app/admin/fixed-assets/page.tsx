import type { Metadata } from "next";
import { Suspense } from "react";
import { FixedAssetsScreen } from "@/components/admin/statements/fixed-assets-screen";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Fixed Assets" };

export default function FixedAssetsPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={5} filters={0} />}>
      <FixedAssetsScreen />
    </Suspense>
  );
}
