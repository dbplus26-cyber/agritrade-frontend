"use client";

import { useSearchParams } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetSeasonQuery } from "@/redux/farm/seasons-api";
import { SeasonForm } from "./season-form";

export function SeasonEdit({ id }: { id: string }) {
  // Read here rather than in SeasonForm: the form is also rendered by the
  // static /admin/seasons/new route, where useSearchParams would need a
  // suspense boundary. This route is dynamic, so it does not.
  const startEditing = useSearchParams().get("edit") === "1";
  const { data, isLoading, isError, error, refetch } = useGetSeasonQuery(id);
  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <SeasonForm season={data.data.season} startEditing={startEditing} />;
}
