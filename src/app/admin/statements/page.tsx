import type { Metadata } from "next";
import { Suspense } from "react";
import { StatementsScreen } from "@/components/admin/statements/statements-screen";
import { DetailSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Financial Statements" };

export default function StatementsPage() {
  return (
    <Suspense fallback={<DetailSkeleton facts={6} />}>
      <StatementsScreen />
    </Suspense>
  );
}
