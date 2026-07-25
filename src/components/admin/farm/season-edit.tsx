"use client";

import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetSeasonQuery } from "@/redux/farm/seasons-api";
import { SeasonForm } from "./season-form";

export function SeasonEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetSeasonQuery(id);
  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <SeasonForm season={data.data.season} />;
}
