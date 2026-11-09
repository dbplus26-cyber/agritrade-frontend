"use client";

import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetBlogPostQuery } from "@/redux/blog/blog-admin-api";
import { PostForm } from "./post-form";

export function PostEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetBlogPostQuery(id);
  if (isLoading) return <FormSkeleton fields={6} className="max-w-[900px]" />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  // Keyed on the post so a save that returns new values re-seeds the form.
  return <PostForm key={data.data.post.id} post={data.data.post} />;
}
