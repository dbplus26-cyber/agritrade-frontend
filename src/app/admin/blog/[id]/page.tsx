import type { Metadata } from "next";
import { PostEdit } from "@/components/admin/blog/post-edit";

export const metadata: Metadata = { title: "Edit post" };

export default async function EditBlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostEdit id={id} />;
}
