"use client";

import { useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
import {
  useCreateFarmerMutation,
  useUpdateFarmerMutation,
} from "@/redux/farm/farmers-api";
import type { ICreateFarmerInput, IFarmer } from "@/types/farm.types";
import { farmerSchema, type FarmerValues } from "@/validations/farm-schema";

const LIST = "/admin/farmers";

export function FarmerForm({ farmer }: { farmer?: IFarmer }) {
  const router = useRouter();
  const [createFarmer, createState] = useCreateFarmerMutation();
  const [updateFarmer, updateState] = useUpdateFarmerMutation();
  const saving = createState.isLoading || updateState.isLoading;
  const photoInput = useRef<HTMLInputElement | null>(null);
  const [photo, setPhoto] = useState<File | undefined>();
  const [preview, setPreview] = useState<string | null>(farmer?.photoUrl ?? null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FarmerValues>({
    resolver: zodResolver(farmerSchema),
    defaultValues: farmer
      ? {
          community: farmer.community ?? "",
          name: farmer.name,
          notes: farmer.notes ?? "",
          phone: farmer.phone ?? "",
        }
      : { community: "", name: "", notes: "", phone: "" },
  });

  const onPick = (file: File | undefined) => {
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (values: FarmerValues) => {
    const body: ICreateFarmerInput = {
      name: values.name,
      ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
      ...(values.community?.trim() ? { community: values.community.trim() } : {}),
      ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
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
      <AdminPageHeader title={farmer ? "Edit farmer" : "Add farmer"} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
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
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-4"
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

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Name" error={errors.name?.message}>
              <Input
                placeholder="Abukari Yakubu"
                className={cn(adminInputClass, errors.name && "border-error")}
                {...register("name")}
              />
            </AdminField>
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                inputMode="tel"
                placeholder="024 000 0000"
                className={cn(adminInputClass, errors.phone && "border-error")}
                {...register("phone")}
              />
            </AdminField>
            <AdminField label="Community" optional error={errors.community?.message}>
              <Input
                placeholder="Kumbungu"
                className={cn(adminInputClass, errors.community && "border-error")}
                {...register("community")}
              />
            </AdminField>
          </div>
          <AdminField label="Notes" optional error={errors.notes?.message}>
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
            {saving ? "Saving…" : farmer ? "Save changes" : "Add farmer"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
