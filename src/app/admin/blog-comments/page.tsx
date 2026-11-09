import type { Metadata } from "next";
import { Suspense } from "react";
import { BlogCommentsScreen } from "@/components/admin/blog/blog-comments-screen";

export const metadata: Metadata = { title: "Blog comments" };

export default function BlogCommentsPage() {
  // useTableQuery reads search params, which need a Suspense boundary.
  return (
    <Suspense>
      <BlogCommentsScreen />
    </Suspense>
  );
}
