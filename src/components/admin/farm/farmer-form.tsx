"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/utils";
import {
  useCreateFarmerMutation,
  useUpdateFarmerMutation,
} from "@/redux/farm/farmers-api";
import type { ICreateFarmerInput, IFarmer } from "@/types/farm.types";
import { farmerSchema, type FarmerValues } from "@/validations/farm-schema";

const LIST = "/admin/farmers";

const ID_TYPE_SUGGESTIONS = [
  "Ghana Card",
  "Voter ID",
  "Passport",
  "Driver Licence",
];

/** "" for create, or the record's values for edit. */
const toFormValues = (farmer?: IFarmer): FarmerValues => ({
  address: farmer?.address ?? "",
  community: farmer?.community ?? "",
  dateOfBirth: farmer?.dateOfBirth ? farmer.dateOfBirth.slice(0, 10) : "",
  farmLocation: farmer?.farmLocation ?? "",
  farmSizeAcres:
    farmer?.farmSizeAcres != null ? String(farmer.farmSizeAcres) : "",
  idNumber: farmer?.idNumber ?? "",
  idType: farmer?.idType ?? "",
  momoNumber: farmer?.momoNumber ?? "",
  name: farmer?.name ?? "",
  nextOfKinName: farmer?.nextOfKinName ?? "",
  nextOfKinPhone: farmer?.nextOfKinPhone ?? "",
  notes: farmer?.notes ?? "",
  phone: farmer?.phone ?? "",
});

export function FarmerForm({ farmer }: { farmer?: IFarmer }) {
  const router = useRouter();
  const [createFarmer, createState] = useCreateFarmerMutation();
  const [updateFarmer, updateState] = useUpdateFarmerMutation();
  const saving = createState.isLoading || updateState.isLoading;
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<File | undefined>();
  // Derived preview: a staged file wins, otherwise the saved photo - so a
  // background refetch or cancel naturally falls back to the record's photo.
  const stagedUrl = useMemo(
    () => (photo ? URL.createObjectURL(photo) : null),
    [photo],
  );
  const preview = stagedUrl ?? farmer?.photoUrl ?? null;

  // Always editable. This route is reached from the farmer's own detail page,
  // which is where the record is READ - so opening locked, on top of a
  // read-only copy of facts the reader has just come from, asked for a second
  // click to do the one thing the page is for.

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FarmerValues>({
    resolver: zodResolver(farmerSchema),
    defaultValues: toFormValues(farmer),
  });

  const onPick = (file: File | undefined) => {
    if (!file) return;
    // Downscale phone-camera photos in the browser before staging them.
    void optimizeImage(file).then(setPhoto);
  };

  const onSubmit = async (values: FarmerValues) => {
    // Empty optional fields are omitted (same shaping as before the profile
    // fields were added).
    const trimmed = (v: string | undefined) => v?.trim() ?? "";
    const body: ICreateFarmerInput = {
      name: values.name,
      ...(trimmed(values.phone) ? { phone: trimmed(values.phone) } : {}),
      ...(trimmed(values.community) ? { community: trimmed(values.community) } : {}),
      ...(trimmed(values.notes) ? { notes: trimmed(values.notes) } : {}),
      ...(trimmed(values.address) ? { address: trimmed(values.address) } : {}),
      ...(trimmed(values.idType) ? { idType: trimmed(values.idType) } : {}),
      ...(trimmed(values.idNumber) ? { idNumber: trimmed(values.idNumber) } : {}),
      ...(values.dateOfBirth ? { dateOfBirth: values.dateOfBirth } : {}),
      ...(trimmed(values.nextOfKinName)
        ? { nextOfKinName: trimmed(values.nextOfKinName) }
        : {}),
      ...(trimmed(values.nextOfKinPhone)
        ? { nextOfKinPhone: trimmed(values.nextOfKinPhone) }
        : {}),
      ...(trimmed(values.farmLocation)
        ? { farmLocation: trimmed(values.farmLocation) }
        : {}),
      ...(trimmed(values.farmSizeAcres)
        ? { farmSizeAcres: Number(values.farmSizeAcres) }
        : {}),
      ...(trimmed(values.momoNumber) ? { momoNumber: trimmed(values.momoNumber) } : {}),
    };
    try {
      if (farmer) {
        await updateFarmer({ id: farmer.id, body, photo }).unwrap();
        notify.success("Farmer updated");
        router.push(`${LIST}/${farmer.id}`);
      } else {
        const res = await createFarmer({ body, photo }).unwrap();
        notify.success("Farmer added");
        router.push(`${LIST}/${res.data.farmer.id}`);
      }
    } catch (err) {
      notify.error("Couldn't save the farmer", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All farmers" className="mb-2" />
      <AdminPageHeader
        title={farmer ? "Edit farmer" : "Add farmer"}
        sub="The outgrower's identity, community and guarantors - every input grant is booked against this record"
      />

      {/* Field pairs are measured against this form, not the viewport. The
          console shell keeps a ~225px rail beside it, so `sm:` fired while the
          column was still too narrow to carry two labelled inputs. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-5">
            {/* Not an AdminField: the control here is a button, and wrapping a
                button in a <label> misroutes its clicks. Same label markup as
                AdminField so it stays in step with the fields under it. */}
            <div>
              <span className="mb-1 block text-[13px] font-semibold text-adm-ink">
                Photo <span className="font-normal text-adm-faint">(optional)</span>
              </span>
              <div className="flex flex-wrap items-center gap-4">
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Cloudinary/blob
                  <img
                    src={preview}
                    alt=""
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-adm-sunken text-[11px] text-adm-faint">
                    No photo
                  </div>
                )}
                <AdminButton
                  type="button"
                  variant="outline"
                  onClick={() => photoInput.current?.click()}
                >
                  {preview ? "Change photo" : "Add photo"}
                </AdminButton>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onPick(e.target.files?.[0])}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
              <AdminField label="Name" error={errors.name?.message}>
                <Input
                  placeholder="e.g. Abukari Yakubu"
                  className={cn(adminInputClass, errors.name && "border-console-red")}
                  {...register("name")}
                />
              </AdminField>
              <AdminField label="Phone" optional error={errors.phone?.message}>
                <Input
                  inputMode="tel"
                  placeholder="e.g. 024 000 0000"
                  className={cn(adminInputClass, errors.phone && "border-console-red")}
                  {...register("phone")}
                />
              </AdminField>
              <AdminField
                label="Date of birth"
                optional
                error={errors.dateOfBirth?.message}
              >
                <DateInput
                  className={cn(
                    adminInputClass,
                    errors.dateOfBirth && "border-console-red",
                  )}
                  {...register("dateOfBirth")}
                />
              </AdminField>
              <AdminField label="ID type" optional error={errors.idType?.message}>
                <Input
                  list="farmer-id-types"
                  placeholder="e.g. Ghana Card"
                  className={cn(adminInputClass, errors.idType && "border-console-red")}
                  {...register("idType")}
                />
                <datalist id="farmer-id-types">
                  {ID_TYPE_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </AdminField>
              <AdminField label="ID number" optional error={errors.idNumber?.message}>
                <Input
                  placeholder="e.g. GHA-000000000-0"
                  className={cn(
                    adminInputClass,
                    errors.idNumber && "border-console-red",
                  )}
                  {...register("idNumber")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
              <AdminField label="Community" optional error={errors.community?.message}>
                <Input
                  placeholder="e.g. Kumbungu"
                  className={cn(
                    adminInputClass,
                    errors.community && "border-console-red",
                  )}
                  {...register("community")}
                />
              </AdminField>
              <AdminField
                label="Farm location"
                optional
                error={errors.farmLocation?.message}
              >
                <Input
                  placeholder="e.g. near the Bontanga dam"
                  className={cn(
                    adminInputClass,
                    errors.farmLocation && "border-console-red",
                  )}
                  {...register("farmLocation")}
                />
              </AdminField>
              <AdminField
                label="Farm size (acres)"
                optional
                error={errors.farmSizeAcres?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 2.5"
                  className={cn(
                    adminInputClass,
                    errors.farmSizeAcres && "border-console-red",
                  )}
                  {...register("farmSizeAcres")}
                />
              </AdminField>
            </div>
            <AdminField label="Address" optional error={errors.address?.message}>
              <textarea
                rows={4}
                placeholder="e.g. House 12, Sagnarigu, Tamale"
                className={cn(
                  adminInputClass,
                  "h-auto min-h-[60px] w-full resize-y py-2",
                  errors.address && "border-console-red",
                )}
                {...register("address")}
              />
            </AdminField>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
              <AdminField
                label="Next of kin name"
                optional
                error={errors.nextOfKinName?.message}
              >
                <Input
                  placeholder="e.g. Fatima Abukari"
                  className={cn(
                    adminInputClass,
                    errors.nextOfKinName && "border-console-red",
                  )}
                  {...register("nextOfKinName")}
                />
              </AdminField>
              <AdminField
                label="Next of kin phone"
                optional
                error={errors.nextOfKinPhone?.message}
              >
                <Input
                  inputMode="tel"
                  placeholder="e.g. 024 000 0000"
                  className={cn(
                    adminInputClass,
                    errors.nextOfKinPhone && "border-console-red",
                  )}
                  {...register("nextOfKinPhone")}
                />
              </AdminField>
              <AdminField
                label="Mobile money number"
                optional
                error={errors.momoNumber?.message}
              >
                <Input
                  inputMode="tel"
                  placeholder="e.g. 024 000 0000"
                  className={cn(
                    adminInputClass,
                    errors.momoNumber && "border-console-red",
                  )}
                  {...register("momoNumber")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <Input
                placeholder="e.g. Farms with his two brothers"
                className={adminInputClass}
                {...register("notes")}
              />
            </AdminField>
          </section>
        </AdminCard>

        {/* Cancel returns to where the record is read rather than locking
            the form back down - there is no locked state any more. */}
        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(farmer ? `${LIST}/${farmer.id}` : LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} size="lg">
            {saving ? "Saving…" : farmer ? "Save changes" : "Add farmer"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
