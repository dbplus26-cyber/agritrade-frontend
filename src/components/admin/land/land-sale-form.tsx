"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetBuyersQuery } from "@/redux/buyers/buyers-api";
import { useGetPlotsQuery } from "@/redux/land/land-plots-api";
import { useCreateLandSaleMutation } from "@/redux/land/land-sales-api";
import { landSaleSchema, type LandSaleValues } from "@/validations/land-schema";

const LIST = "/admin/land-sales";

/** Draft a land sale. `plotId` may be pre-filled from a plot's "Sell" action. */
export function LandSaleForm({ plotId }: { plotId?: string }) {
  const router = useRouter();
  const [createSale, { isLoading: saving }] = useCreateLandSaleMutation();
  // Only AVAILABLE plots can be sold.
  const plots = useGetPlotsQuery({ status: "AVAILABLE", limit: 100 });
  const buyers = useGetBuyersQuery({ limit: 100, isActive: true });

  const {
    register,
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
      <AdminPageHeader title="New land sale" />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Plot" error={errors.plotId?.message}>
            <select
              className={cn(adminSelectClass, "w-full", errors.plotId && "border-error")}
              {...register("plotId")}
            >
              <option value="">Choose an available plot</option>
              {(plots.data?.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.reference} · {p.locationText}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Buyer" error={errors.buyerId?.message}>
            <select
              className={cn(adminSelectClass, "w-full", errors.buyerId && "border-error")}
              {...register("buyerId")}
            >
              <option value="">Choose the buyer</option>
              {(buyers.data?.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Agreed price (GHS)" error={errors.agreedPriceGhs?.message}>
            <Input
              inputMode="decimal"
              className={cn(adminInputClass, errors.agreedPriceGhs && "border-error")}
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
