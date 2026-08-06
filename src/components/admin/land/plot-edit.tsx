"use client";

import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetPlotQuery } from "@/redux/land/land-plots-api";
import { PlotForm } from "./plot-form";

export function PlotEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetPlotQuery(id);
  if (isLoading) return <FormSkeleton fields={8} className="max-w-[640px]" />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <PlotForm plot={data.data.plot} />;
}
