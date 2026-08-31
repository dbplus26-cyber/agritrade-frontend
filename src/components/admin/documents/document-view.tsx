"use client";

import { DocumentSheet } from "@/components/admin/documents/document-sheet";
import { DocumentSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import {
  type DocumentArgs,
  useGetDocumentQuery,
} from "@/redux/documents/documents-api";

/**
 * A document on screen: fetch the server's own description of it, then draw
 * it. Every page that shows a document uses this, so none of them has an
 * opinion about what a document looks like.
 *
 * The fetch is forced on mount rather than served from cache - a document
 * states a balance, and the balance moves while the tab it was opened from
 * sits there.
 */
export function DocumentView({
  args,
  className,
}: {
  args: DocumentArgs;
  className?: string;
}) {
  const { data, error, isError, isLoading, refetch } = useGetDocumentQuery(
    args,
    { refetchOnMountOrArgChange: true },
  );

  if (isLoading) return <DocumentSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  return <DocumentSheet className={className} document={data.data.document} />;
}
