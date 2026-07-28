import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsScreen } from "@/components/admin/inbox/reviews-screen";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";

export const metadata: Metadata = { title: "Reviews" };

/** The website review moderation queue. */
export default function ReviewsPage() {
  return (
    <Suspense fallback={<DataTableSkeleton />}>
      <ReviewsScreen />
    </Suspense>
  );
}
