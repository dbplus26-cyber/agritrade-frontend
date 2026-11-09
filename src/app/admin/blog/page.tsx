import type { Metadata } from "next";
import { Suspense } from "react";
import { PostsRegister } from "@/components/admin/blog/posts-register";

export const metadata: Metadata = { title: "Blog posts" };

export default function BlogPostsPage() {
  // useTableQuery reads search params, which need a Suspense boundary.
  return (
    <Suspense>
      <PostsRegister />
    </Suspense>
  );
}
