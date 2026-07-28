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
import { useGetLandSellersQuery } from "@/redux/land/land-sellers-api";
import { useCreateLandAcquisitionMutation } from "@/redux/land/land-acquisitions-api";
import {
  landAcquisitionSchema,
  type LandAcquisitionValues,
} from "@/validations/land-schema";

const LIST = "/admin/land-acquisitions";

/** Record a new land purchase from a seller. */
export function LandAcquisitionForm() {
  const router = useRouter();
  const [create, { isLoading: saving }] = useCreateLandAcquisitionMutation();
  const sellers = useGetLandSellersQuery({ limit: 100, isActive: true });

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LandAcquisitionValues>({
    resolver: zodResolver(landAcquisitionSchema),
    defaultValues: {
      agreedCostGhs: "",
      description: "",
      locationText: "",
      notes: "",
      reference: "",
      sellerId: "",
      sizeAcres: "",
      sizeText: "",
      use: "",
    },
  });

  const onSubmit = async (values: LandAcquisitionValues) => {
    try {
      const res = await create({
        agreedCostGhs: Number(values.agreedCostGhs),
        locationText: values.locationText.trim(),
        reference: values.reference.trim(),
        sellerId: values.sellerId,
        sizeText: values.sizeText.trim(),
        ...(values.sizeAcres?.trim()
          ? { sizeAcres: Number(values.sizeAcres) }
          : {}),
        ...(values.use?.trim() ? { use: values.use.trim() } : {}),
        ...(values.description?.trim()
          ? { description: values.description.trim() }
          : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Acquisition recorded");
      router.push(`${LIST}/${res.data.acquisition.id}`);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "reference",
          "sellerId",
          "locationText",
          "sizeText",
          "agreedCostGhs",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't record the acquisition", { description: message });
    }
  };

  return (
    <div className="max-w-[620px]">
      <BackButton href={LIST} label="All acquisitions" className="mb-2" />
      <AdminPageHeader
        title="New land acquisition"
        sub="Buying a plot from a seller. It enters the plot register once completed."
      />

      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Seller" error={errors.sellerId?.message}>
            <Controller
              control={control}
              name="sellerId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={(sellers.data?.data ?? []).map((s) => ({
                    value: s.id,
                    label: s.name,
                    ...(s.community ? { hint: s.community } : {}),
                  }))}
                  placeholder="Choose the seller"
                  className={cn(errors.sellerId && "border-error")}
                />
              )}
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Register code"
              hint="Becomes the plot's reference once the deal completes."
              error={errors.reference?.message}
            >
              <Input
                placeholder="e.g. TML-021"
                className={cn(
                  adminInputClass,
                  errors.reference && "border-error",
                )}
                {...register("reference")}
              />
            </AdminField>
            <AdminField
              label="Agreed cost (GHS)"
              error={errors.agreedCostGhs?.message}
            >
              <Input
                inputMode="decimal"
                className={cn(
                  adminInputClass,
                  errors.agreedCostGhs && "border-error",
                )}
                {...register("agreedCostGhs")}
              />
            </AdminField>
          </div>
          <AdminField label="Location" error={errors.locationText?.message}>
            <Input
              placeholder="e.g. Kumbungu Road, Plot 21"
              className={cn(
                adminInputClass,
                errors.locationText && "border-error",
              )}
              {...register("locationText")}
            />
          </AdminField>
          <div className="grid gap-3 sm:grid-cols-3">
            <AdminField label="Size" error={errors.sizeText?.message}>
              <Input
                placeholder='e.g. 100 x 100 ft'
                className={cn(
                  adminInputClass,
                  errors.sizeText && "border-error",
                )}
                {...register("sizeText")}
              />
            </AdminField>
            <AdminField label="Acres" optional error={errors.sizeAcres?.message}>
              <Input
                inputMode="decimal"
                className={cn(
                  adminInputClass,
                  errors.sizeAcres && "border-error",
                )}
                {...register("sizeAcres")}
              />
            </AdminField>
            <AdminField label="Use" optional>
              <Input
                placeholder="residential"
                className={adminInputClass}
                {...register("use")}
              />
            </AdminField>
          </div>
          <AdminField label="Description" optional>
            <textarea
              rows={2}
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
              )}
              {...register("description")}
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
            {saving ? "Saving..." : "Record acquisition"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
