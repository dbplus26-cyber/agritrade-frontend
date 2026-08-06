"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetBuyersQuery } from "@/redux/buyers/buyers-api";
import { useGetPlotsQuery } from "@/redux/land/land-plots-api";
import { useCreateLandSaleMutation } from "@/redux/land/land-sales-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { landSaleSchema, type LandSaleValues } from "@/validations/land-schema";

const LIST = "/admin/land-sales";

/** Draft a land sale. `plotId` may be pre-filled from a plot's "Sell" action. */
export function LandSaleForm({ plotId }: { plotId?: string }) {
  const router = useRouter();
  const [createSale, { isLoading: saving }] = useCreateLandSaleMutation();
  // Only AVAILABLE plots can be sold.
  const plotSearch = useRemoteSearch();
  const plots = useGetPlotsQuery({
    limit: 20,
    search: plotSearch.query,
    status: "AVAILABLE",
  });
  const buyerSearch = useRemoteSearch();
  const buyers = useGetBuyersQuery({
    isActive: true,
    limit: 20,
    search: buyerSearch.query,
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LandSaleValues>({
    resolver: zodResolver(landSaleSchema),
    defaultValues: {
      agreedPriceGhs: "",
      buyerId: "",
      notes: "",
      plotId: plotId ?? "",
    },
  });

  const onSubmit = async (values: LandSaleValues) => {
    try {
      const res = await createSale({
        agreedPriceGhs: Number(values.agreedPriceGhs),
        buyerId: values.buyerId,
        plotId: values.plotId,
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Land sale drafted");
      router.push(`${LIST}/${res.data.sale.id}`);
    } catch (err) {
      notify.error("Couldn't draft the land sale", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All land sales" className="mb-2" />
      <AdminPageHeader
        title="New land sale"
        sub="Agree a plot and price with a buyer - the plot is only reserved once you confirm the sale"
      />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Plot" error={errors.plotId?.message}>
            <Controller
              control={control}
              name="plotId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={(plots.data?.data ?? []).map((p) => ({
                    value: p.id,
                    label: p.reference,
                    hint: p.locationText,
                  }))}
                  placeholder="Choose an available plot"
                  onSearchChange={plotSearch.onSearchChange}
                  loading={plots.isFetching}
                  className={cn(errors.plotId && "border-console-red")}
                />
              )}
            />
          </AdminField>
          <AdminField label="Buyer" error={errors.buyerId?.message}>
            <Controller
              control={control}
              name="buyerId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={(buyers.data?.data ?? []).map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                  placeholder="Choose the buyer"
                  onSearchChange={buyerSearch.onSearchChange}
                  loading={buyers.isFetching}
                  className={cn(errors.buyerId && "border-console-red")}
                />
              )}
            />
          </AdminField>
          <AdminField label="Agreed price (GHS)" error={errors.agreedPriceGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.agreedPriceGhs && "border-console-red")}
              {...register("agreedPriceGhs")}
            />
          </AdminField>
          <AdminField label="Notes" optional>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
        </AdminCard>

        <div className="flex justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            className="h-10 px-4"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} className="h-10 px-5">
            {saving ? "Saving…" : "Draft sale"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
