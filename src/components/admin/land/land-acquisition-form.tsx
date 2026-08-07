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
  SectionHeading,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetLandSellersQuery } from "@/redux/land/land-sellers-api";
import { useCreateLandAcquisitionMutation } from "@/redux/land/land-acquisitions-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import {
  landAcquisitionSchema,
  type LandAcquisitionValues,
} from "@/validations/land-schema";

const LIST = "/admin/land-acquisitions";

/** Record a new land purchase from a seller. */
export function LandAcquisitionForm() {
  const router = useRouter();
  const [create, { isLoading: saving }] = useCreateLandAcquisitionMutation();
  const sellerSearch = useRemoteSearch();
  const sellers = useGetLandSellersQuery({
    isActive: true,
    limit: 20,
    search: sellerSearch.query,
  });

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
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All acquisitions" className="mb-2" />
      <AdminPageHeader
        title="New land acquisition"
        hint="Record land you are buying, and the price agreed with the seller."
        sub="Buying a plot from a seller. It enters the plot register once completed."
      />

      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` paired fields up while
          the column was still too narrow to carry two of them. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-3">
            <SectionHeading
              className="mb-0"
              hint="Who you are buying from, and what you agreed to pay."
            >
              Who and how much
            </SectionHeading>
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
                    placeholder="e.g. Naa Alhassan Yakubu"
                    onSearchChange={sellerSearch.onSearchChange}
                    loading={sellers.isFetching}
                    className={cn(errors.sellerId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
            <div className="grid gap-3 @min-[440px]:grid-cols-2">
              <AdminField
                label="Register code"
                hint="Becomes the plot's reference once the deal completes."
                error={errors.reference?.message}
              >
                <Input
                  placeholder="e.g. TML-021"
                  className={cn(
                    adminInputClass,
                    errors.reference && "border-console-red",
                  )}
                  {...register("reference")}
                />
              </AdminField>
              <AdminField
                label="Agreed cost (GHS)"
                hint="The whole price settled with the seller, whatever you have paid so far."
                error={errors.agreedCostGhs?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 45000"
                  className={cn(
                    adminInputClass,
                    errors.agreedCostGhs && "border-console-red",
                  )}
                  {...register("agreedCostGhs")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-adm-hairline pt-5">
            <SectionHeading
              className="mb-0"
              hint="Where the land is and how big it is - what a buyer or a surveyor would ask first."
            >
              The plot itself
            </SectionHeading>
            <AdminField label="Location" error={errors.locationText?.message}>
              <Input
                placeholder="e.g. Kumbungu Road, Plot 21"
                className={cn(
                  adminInputClass,
                  errors.locationText && "border-console-red",
                )}
                {...register("locationText")}
              />
            </AdminField>
            <div className="grid gap-3 @min-[440px]:grid-cols-2 @min-[620px]:grid-cols-3">
              <AdminField label="Size" error={errors.sizeText?.message}>
                <Input
                  placeholder='e.g. 100 x 100 ft'
                  className={cn(
                    adminInputClass,
                    errors.sizeText && "border-console-red",
                  )}
                  {...register("sizeText")}
                />
              </AdminField>
              <AdminField
                error={errors.sizeAcres?.message}
                hint="The same size as a plain number, so plots can be compared and priced per acre."
                label="Acres"
                optional
              >
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 0.25"
                  className={cn(
                    adminInputClass,
                    errors.sizeAcres && "border-console-red",
                  )}
                  {...register("sizeAcres")}
                />
              </AdminField>
              <AdminField label="Use" optional>
                <Input
                  placeholder="e.g. residential"
                  className={adminInputClass}
                  {...register("use")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-3 border-t border-adm-hairline pt-5">
            <SectionHeading className="mb-0">Anything else</SectionHeading>
            <AdminField label="Description" optional>
              <textarea
                rows={4}
                placeholder="e.g. Corner plot, fenced on two sides, borehole on site"
                className={cn(
                  adminInputClass,
                  "h-auto min-h-[60px] w-full resize-y py-2",
                )}
                {...register("description")}
              />
            </AdminField>
            <AdminField label="Notes" optional>
              <Input
                placeholder="e.g. Boundary pillars still to be planted"
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
            {saving ? "Saving..." : "Record acquisition"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
