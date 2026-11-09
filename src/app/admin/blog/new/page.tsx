import type { Metadata } from "next";
import { PostForm } from "@/components/admin/blog/post-form";

export const metadata: Metadata = { title: "New post" };

export default function NewBlogPostPage() {
  return <PostForm />;
}
