"use client";

import { useSearchParams } from "next/navigation";
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetFarmerQuery } from "@/redux/farm/farmers-api";
import { FarmerForm } from "./farmer-form";

export function FarmerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetFarmerQuery(id);
  // Callers that already know the user means to edit (the detail page's Edit
  // button) link to ?edit=1 so the form opens unlocked instead of making them
  // press "Edit farmer" a second time. A bare /edit URL still opens read-only.
  const startEditing = useSearchParams().get("edit") === "1";
  if (isLoading) return <FormSkeleton fields={8} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );
  return <FarmerForm farmer={data.data.farmer} startEditing={startEditing} />;
}
