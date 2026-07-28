"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
      {children}
    </div>
  );
}

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

export function FarmerForm({
  farmer,
  startEditing = false,
}: {
  farmer?: IFarmer;
  /** Open an existing farmer unlocked - set when the caller already knows the
   * user means to edit (the detail page's Edit button). */
  startEditing?: boolean;
}) {
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

  // Edit opens READ-ONLY; the Edit button unlocks the whole form. Create is
  // always editable, and so is an edit the caller has already asked to unlock.
  const [isEditing, setIsEditing] = useState(
    farmer === undefined || startEditing,
  );
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const clearPhotoState = () => {
    setPhoto(undefined);
    if (photoInput.current) photoInput.current.value = "";
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FarmerValues>({
    resolver: zodResolver(farmerSchema),
    defaultValues: toFormValues(farmer),
  });

  // A background refetch can bump the record. Track the fresh values while
  // reading, but never clobber an in-progress edit.
  useEffect(() => {
    if (farmer && !isEditing) reset(toFormValues(farmer));
  }, [farmer, isEditing, reset]);

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
    <div className="max-w-[600px]">
      <BackButton href={LIST} label="All farmers" className="mb-2" />
      <AdminPageHeader
        title={farmer ? "Edit farmer" : "Add farmer"}
        sub="The outgrower's identity, community and guarantors - every input grant is booked against this record"
      />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <SectionLabel>Identity</SectionLabel>
          <div className="flex items-center gap-4">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element -- Cloudinary/blob
              <img
                src={preview}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-alt text-[11px] text-soil/60">
                No photo
              </div>
            )}
            {isEditing ? (
              <AdminButton
                type="button"
                variant="outline"
                className="h-9 px-4"
                onClick={() => photoInput.current?.click()}
              >
                {preview ? "Change photo" : "Add photo"}
              </AdminButton>
            ) : null}
            <input
              ref={photoInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0])}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Name" error={errors.name?.message}>
              <Input
                placeholder="Abukari Yakubu"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.name && "border-error")}
                {...register("name")}
              />
            </AdminField>
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                inputMode="tel"
                placeholder="024 000 0000"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.phone && "border-error")}
                {...register("phone")}
              />
            </AdminField>
            <AdminField
              label="Date of birth"
              optional
              error={errors.dateOfBirth?.message}
            >
              <Input
                type="date"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.dateOfBirth && "border-error",
                )}
                {...register("dateOfBirth")}
              />
            </AdminField>
            <AdminField label="ID type" optional error={errors.idType?.message}>
              <Input
                list="farmer-id-types"
                placeholder="Ghana Card, Voter ID…"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.idType && "border-error")}
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
                placeholder="GHA-000000000-0"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.idNumber && "border-error",
                )}
                {...register("idNumber")}
              />
            </AdminField>
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <SectionLabel>Location</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Community" optional error={errors.community?.message}>
              <Input
                placeholder="Kumbungu"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.community && "border-error",
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
                placeholder="Near the Bontanga dam"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.farmLocation && "border-error",
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
                placeholder="2.5"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.farmSizeAcres && "border-error",
                )}
                {...register("farmSizeAcres")}
              />
            </AdminField>
          </div>
          <AdminField label="Address" optional error={errors.address?.message}>
            <textarea
              rows={2}
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "h-auto min-h-[60px] w-full resize-y py-2",
                errors.address && "border-error",
              )}
              {...register("address")}
            />
          </AdminField>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <SectionLabel>Contacts &amp; payout</SectionLabel>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField
              label="Next of kin name"
              optional
              error={errors.nextOfKinName?.message}
            >
              <Input
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.nextOfKinName && "border-error",
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
                placeholder="024 000 0000"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.nextOfKinPhone && "border-error",
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
                placeholder="024 000 0000"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.momoNumber && "border-error",
                )}
                {...register("momoNumber")}
              />
            </AdminField>
          </div>
        </AdminCard>

        <AdminCard className="px-5 py-4">
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input
              disabled={readOnly}
              className={cn(adminInputClass, roCls)}
              {...register("notes")}
            />
          </AdminField>
        </AdminCard>

        {/* This row keeps its own markup rather than EditableFormActions
            because it is right-aligned and puts Cancel before the primary
            button. The key on every branch is still load-bearing: an unkeyed
            branch lets React reuse the same <button> DOM node across the
            swap, so clicking "Edit farmer" would flip that very element to
            type="submit" before the browser ran the click's default action
            and the form would PATCH itself while still locked. */}
        <div className="flex justify-end gap-2">
          {!farmer ? (
            <Fragment key="create">
              <AdminButton
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() => router.push(LIST)}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} className="h-10 px-5">
                {saving ? "Saving…" : "Add farmer"}
              </AdminButton>
            </Fragment>
          ) : isEditing ? (
            <Fragment key="editing">
              <AdminButton
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() => {
                  reset();
                  clearPhotoState();
                  setIsEditing(false);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} className="h-10 px-5">
                {saving ? "Saving…" : "Save changes"}
              </AdminButton>
            </Fragment>
          ) : (
            <AdminButton
              key="locked"
              type="button"
              variant="gold"
              className="h-10 px-5"
              onClick={() => setIsEditing(true)}
            >
              Edit farmer
            </AdminButton>
          )}
        </div>
      </form>
    </div>
  );
}
