"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminField,
  adminInputClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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

/**
 * Draft a land sale: which plot, to whom, at what price.
 *
 * Four fields, so it asks for them where the selling decision is taken -
 * the land-sales register, or the plot itself - rather than on a page of its
 * own. `plotId` pre-fills the plot when a plot's "Sell" action opened it.
 */
export function LandSaleDialog({
  onClose,
  open,
  plotId,
}: {
  onClose: () => void;
  open: boolean;
  plotId?: string;
}) {
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
    reset,
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

  // Opened from a plot, the plot is already decided. It arrives after the
  // form is built when the page is still fetching, so seed it on open too.
  useEffect(() => {
    if (open) reset({ agreedPriceGhs: "", buyerId: "", notes: "", plotId: plotId ?? "" });
  }, [open, plotId, reset]);

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: LandSaleValues) => {
    try {
      const res = await createSale({
        agreedPriceGhs: Number(values.agreedPriceGhs),
        buyerId: values.buyerId,
        plotId: values.plotId,
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Land sale drafted");
      close();
      router.push(`${LIST}/${res.data.sale.id}`);
    } catch (err) {
      notify.error("Couldn't draft the land sale", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent className="sm:max-w-[560px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Sell a plot</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Agree a plot and price with a buyer. The plot is only reserved once
            you confirm the sale.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          {/* What is being sold and who is buying it are one decision, and
              neither picker needs a row of its own to hold a single line. */}
          <div className="grid gap-5 sm:grid-cols-2">
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
          </div>

          <AdminField
            error={errors.agreedPriceGhs?.message}
            hint="The whole price the buyer is taking the plot at, before any deposit."
            label="Agreed price (GHS)"
          >
            <Input
              inputMode="decimal"
              placeholder="e.g. 60000"
              className={cn(
                adminInputClass,
                "font-adminmono",
                errors.agreedPriceGhs && "border-console-red",
              )}
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

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={close}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              disabled={saving}
              loading={saving}
              size="lg"
            >
              {saving ? "Saving…" : "Draft sale"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
