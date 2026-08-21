"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  DetailHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
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
    <div className="max-w-[640px]">
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Land sales", href: LIST }]}
        current="New land sale"
      />
      <DetailHeader
        title="New land sale"
        hint="Sell a plot to a buyer and set what they owe."
        sub="Agree a plot and price with a buyer - the plot is only reserved once you confirm the sale"
      />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-5">
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
                    placeholder="e.g. TML-021"
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
                    placeholder="e.g. Ama Mensah"
                    onSearchChange={buyerSearch.onSearchChange}
                    loading={buyers.isFetching}
                    className={cn(errors.buyerId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
          </section>

          <section className="flex flex-col gap-5">
            <AdminField
              error={errors.agreedPriceGhs?.message}
              hint="The whole price the buyer is taking the plot at, before any deposit."
              label="Agreed price (GHS)"
            >
              <Input
                inputMode="decimal"
                placeholder="e.g. 60000"
                className={cn(adminInputClass, errors.agreedPriceGhs && "border-console-red")}
                {...register("agreedPriceGhs")}
              />
            </AdminField>
            <AdminField label="Notes" optional>
              <Input
                placeholder="e.g. Buyer paying in three instalments"
                className={adminInputClass}
                {...register("notes")}
              />
            </AdminField>
          </section>
        </AdminCard>

        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} size="lg">
            {saving ? "Saving…" : "Draft sale"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
