"use client";

import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetFarmerQuery } from "@/redux/farm/farmers-api";
import { FarmerForm } from "./farmer-form";

export function FarmerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetFarmerQuery(id);
  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <FarmerForm farmer={data.data.farmer} />;
}
