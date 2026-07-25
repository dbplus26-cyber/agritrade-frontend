"use client";

import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetInputItemQuery } from "@/redux/farm/input-items-api";
import { InputItemForm } from "./input-item-form";

export function InputItemEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetInputItemQuery(id);
  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <InputItemForm item={data.data.item} />;
}
