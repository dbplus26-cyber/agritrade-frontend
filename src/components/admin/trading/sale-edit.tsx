"use client";

import { useRouter } from "next/navigation";
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetSaleQuery } from "@/redux/sales/admin-sales-api";
import { SaleForm } from "./sale-form";

/** Loads a draft sale and hands it to the shared form; only drafts are editable. */
export function SaleEdit({ id }: { id: string }) {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useGetSaleQuery(id);

  if (isLoading) return <FormSkeleton fields={6} className="max-w-[720px]" />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const sale = data.data.sale;
  if (sale.status !== "DRAFT") {
    router.replace(`/admin/sales/${id}`);
    return null;
  }
  return <SaleForm sale={sale} />;
}
