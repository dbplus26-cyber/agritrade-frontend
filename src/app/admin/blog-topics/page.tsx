import type { Metadata } from "next";
import { BlogTopicsScreen } from "@/components/admin/blog/blog-topics-screen";

export const metadata: Metadata = { title: "Categories & tags" };

export default function BlogTopicsPage() {
  return <BlogTopicsScreen />;
}
