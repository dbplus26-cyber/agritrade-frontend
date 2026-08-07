import type { Metadata } from "next";
import { Suspense } from "react";
import { DrawingsScreen } from "@/components/admin/statements/drawings-screen";
import { RegisterSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Drawings" };

export default function DrawingsPage() {
  return (
    <Suspense fallback={<RegisterSkeleton columns={4} filters={0} />}>
      <DrawingsScreen />
    </Suspense>
  );
}
