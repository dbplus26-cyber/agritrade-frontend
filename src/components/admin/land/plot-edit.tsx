"use client";

import { useSearchParams } from "next/navigation";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetPlotQuery } from "@/redux/land/land-plots-api";
import { PlotForm } from "./plot-form";

export function PlotEdit({ id }: { id: string }) {
  // Read here rather than in PlotForm: the form is also rendered by the static
  // /admin/plots/new route, where useSearchParams would need a suspense
  // boundary. This route is dynamic, so it does not.
  const startEditing = useSearchParams().get("edit") === "1";
  const { data, isLoading, isError, error, refetch } = useGetPlotQuery(id);
  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <PlotForm plot={data.data.plot} startEditing={startEditing} />;
}
