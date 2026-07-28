import type { Metadata } from "next";
import { Suspense } from "react";
import { ReviewsScreen } from "@/components/admin/inbox/reviews-screen";
import { CardGridSkeleton, FilterBarSkeleton, PageHeaderSkeleton } from "@/components/admin/skeletons";

export const metadata: Metadata = { title: "Reviews" };

/** The website review moderation queue. */
export default function ReviewsPage() {
  return (
    <Suspense fallback={<div>
        <PageHeaderSkeleton />
        <FilterBarSkeleton filters={3} />
        <CardGridSkeleton />
      </div>}>
      <ReviewsScreen />
    </Suspense>
  );
}
