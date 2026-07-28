"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  adminInputClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { DataTableSkeleton } from "@/components/ui/DataTableSkeleton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import {
  useCreateCommodityMutation,
  useDeactivateCommodityMutation,
  useActivateCommodityMutation,
  useDeleteCommodityMutation,
  useGetCommodityQuery,
  usePublishCommodityMutation,
  useUpdateCommodityMutation,
} from "@/redux/commodities/commodities-api";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/utils";
import type {
  ICommodity,
  IUpdateCommodityInput,
} from "@/types/registry.types";
import {
  commoditySchema,
  type CommodityValues,
} from "@/validations/registry-schema";
import { LifecycleActions } from "./lifecycle-actions";

const LIST = "/admin/commodities";

/** "" for create, or the record's values for edit. */
const toFormValues = (c?: ICommodity): CommodityValues => ({
  name: c?.name ?? "",
  variety: c?.variety ?? "",
  qualityGrade: c?.qualityGrade ?? "",
  description: c?.description ?? "",
  bagWeightKg: c?.bagWeightKg != null ? String(c.bagWeightKg) : "",
  sortOrder: c ? String(c.sortOrder) : "",
});

function CommodityFormFields({ commodity }: { commodity?: ICommodity }) {
  const router = useRouter();
  const isEdit = commodity !== undefined;

  const [createCommodity, createState] = useCreateCommodityMutation();
  const [updateCommodity, updateState] = useUpdateCommodityMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit screens open READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
  const [isEditing, setIsEditing] = useState(!isEdit);
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  // Photo travels WITH the save (multipart payload + file, the profile-photo
  // convention); `removePhoto` clears an existing one server-side.
  const fileInput = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const previewUrl = photoFile
    ? URL.createObjectURL(photoFile)
    : !removePhoto
      ? (commodity?.photo ?? null)
      : null;

  const clearPhotoState = () => {
    setPhotoFile(null);
    setRemovePhoto(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CommodityValues>({
    resolver: zodResolver(commoditySchema),
    defaultValues: toFormValues(commodity),
  });

  // A background refetch can bump the record (the publish toggle on this very
  // page, another tab). Track the fresh values while reading, but never
  // clobber an in-progress edit - which is why the parent does not
  // key-remount the form on updatedAt.
  useEffect(() => {
    if (!isEditing) {
      reset(toFormValues(commodity));
      // Drop any staged file from the native input too, so re-picking the
      // same photo later still fires onChange.
      if (fileInput.current) fileInput.current.value = "";
    }
  }, [commodity, isEditing, reset]);

  const onSubmit = async (values: CommodityValues) => {
    // "" clears on edit (null) and is omitted on create.
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    const body: IUpdateCommodityInput = {
      name: values.name,
      variety: opt(values.variety),
      qualityGrade: opt(values.qualityGrade),
      description: opt(values.description),
      bagWeightKg: values.bagWeightKg?.trim()
        ? Number(values.bagWeightKg)
        : isEdit
          ? null
          : undefined,
      ...(values.sortOrder?.trim()
        ? { sortOrder: Number(values.sortOrder) }
        : {}),
      ...(isEdit && removePhoto && !photoFile ? { removePhoto: true } : {}),
    };

    try {
      if (isEdit) {
        await updateCommodity({
          id: commodity.id,
          body,
          photo: photoFile ?? undefined,
        }).unwrap();
        // Dropping back to read mode lets the sync effect adopt the fresh
        // values and finish the photo-input cleanup.
        setPhotoFile(null);
        setRemovePhoto(false);
        notify.success("Commodity updated");
        setIsEditing(false);
      } else {
        const res = await createCommodity({
          body: {
            name: values.name,
            variety: body.variety ?? undefined,
            qualityGrade: body.qualityGrade ?? undefined,
            description: body.description ?? undefined,
            bagWeightKg: body.bagWeightKg ?? undefined,
            sortOrder: body.sortOrder,
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        notify.success("Commodity created");
        router.replace(`${LIST}/${res.data.commodity.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "name",
          "variety",
          "qualityGrade",
          "description",
          "bagWeightKg",
          "sortOrder",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the commodity" : "Couldn't create the commodity",
        { description: message },
      );
    }
  };

  return (
    <AdminCard className="px-5 py-[18px]">
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-[13px]"
      >
        <AdminField label="Name" error={errors.name?.message}>
          <Input
            placeholder="e.g. White Maize"
            disabled={readOnly}
            className={cn(adminInputClass, roCls, errors.name && "border-error")}
            {...register("name")}
          />
        </AdminField>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Variety"
            optional
            error={errors.variety?.message}
            hint="Cultivar shown on documents, e.g. Obatanpa."
          >
            <Input
              placeholder="e.g. Obatanpa"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.variety && "border-error",
              )}
              {...register("variety")}
            />
          </AdminField>
          <AdminField
            label="Quality grade"
            optional
            error={errors.qualityGrade?.message}
          >
            <Input
              placeholder="e.g. Grade 1"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.qualityGrade && "border-error",
              )}
              {...register("qualityGrade")}
            />
          </AdminField>
        </div>
        <div className="grid gap-[13px] sm:grid-cols-2">
          <AdminField
            label="Bag weight (kg)"
            optional
            hint="Display convention only - stock is always tracked in kg."
            error={errors.bagWeightKg?.message}
          >
            <Input
              inputMode="decimal"
              placeholder="e.g. 50"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "font-adminmono",
                errors.bagWeightKg && "border-error",
              )}
              {...register("bagWeightKg")}
            />
          </AdminField>
          <AdminField
            label="Sort order"
            optional
            hint="Lower numbers list first in pickers and on the website."
            error={errors.sortOrder?.message}
          >
            <Input
              inputMode="numeric"
              placeholder="0"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "font-adminmono",
                errors.sortOrder && "border-error",
              )}
              {...register("sortOrder")}
            />
          </AdminField>
        </div>
        <AdminField
          label="Description"
          optional
          error={errors.description?.message}
        >
          <textarea
            rows={3}
            placeholder="Shown on the website's commodity card when published."
            disabled={readOnly}
            className={cn(
              adminInputClass,
              roCls,
              "h-auto min-h-[76px] w-full resize-y py-2",
              errors.description && "border-error",
            )}
            {...register("description")}
          />
        </AdminField>

        <AdminField
          label="Photo"
          optional
          hint="Used on the website's commodity card. JPG or PNG."
        >
          <div className="flex items-center gap-3">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- preview
              <img
                src={previewUrl}
                alt="Commodity photo"
                className="h-14 w-14 flex-none rounded-[4px] border border-soil/25 object-cover"
              />
            ) : (
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[4px] border border-dashed border-soil/35 text-[10px] text-soil/60">
                No photo
              </span>
            )}
            {isEditing ? (
              <div className="flex flex-wrap gap-2">
                <AdminButton
                  type="button"
                  variant="secondary"
                  className="h-[32px] px-3 text-[12.5px]"
                  onClick={() => fileInput.current?.click()}
                >
                  {previewUrl ? "Replace photo" : "Choose photo"}
                </AdminButton>
                {previewUrl ? (
                  <AdminButton
                    type="button"
                    variant="outline"
                    className="h-[32px] px-3 text-[12.5px]"
                    onClick={() => {
                      setPhotoFile(null);
                      setRemovePhoto(true);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  >
                    Remove
                  </AdminButton>
                ) : null}
              </div>
            ) : null}
            <input
              ref={fileInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (file) {
                  void optimizeImage(file).then((staged) => {
                    setPhotoFile(staged);
                    setRemovePhoto(false);
                  });
                }
              }}
            />
          </div>
        </AdminField>

        <EditableFormActions
          mode={!isEdit ? "create" : isEditing ? "editing" : "locked"}
          saving={saving}
          createLabel="Create commodity"
          editLabel="Edit commodity"
          onEdit={() => setIsEditing(true)}
          onCancel={() => {
            if (!isEdit) {
              router.push(LIST);
              return;
            }
            reset();
            clearPhotoState();
            setIsEditing(false);
          }}
        />
      </form>
    </AdminCard>
  );
}

/** Create screen. */
export function CommodityCreate() {
  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All commodities" className="mb-2" />
      <AdminPageHeader
        title="Add commodity"
        sub="Name, variety and grade - how this commodity appears everywhere"
      />
      <CommodityFormFields />
    </div>
  );
}

/** Edit screen: the form plus website visibility and lifecycle actions. */
export function CommodityEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetCommodityQuery(id);
  const [publishCommodity] = usePublishCommodityMutation();
  const [activateCommodity] = useActivateCommodityMutation();
  const [deactivateCommodity] = useDeactivateCommodityMutation();
  const [deleteCommodity] = useDeleteCommodityMutation();

  if (isLoading) return <DataTableSkeleton />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const commodity = data.data.commodity;

  const togglePublish = async (publishToWebsite: boolean) => {
    try {
      await publishCommodity({ id, publishToWebsite }).unwrap();
      notify.success(
        publishToWebsite
          ? "Published to the website"
          : "Removed from the website",
      );
    } catch (err) {
      notify.error("Couldn't change website visibility", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All commodities" className="mb-2" />
      <AdminPageHeader
        title={commodity.name}
        sub="Edit the commodity, its website visibility and lifecycle"
      />
      <CommodityFormFields commodity={commodity} />

      <AdminCard className="mt-4 px-5 py-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-[13px] font-semibold text-ink">
              Show on website
            </span>
            <span className="block text-[12px] text-soil">
              The site lists it as available while stock is on hand - never
              quantities. Inactive commodities cannot be published.
            </span>
          </span>
          <Switch
            checked={commodity.publishToWebsite}
            disabled={!commodity.isActive}
            onCheckedChange={(v) => void togglePublish(v)}
          />
        </label>
      </AdminCard>

      <LifecycleActions
        noun="commodity"
        name={commodity.name}
        isActive={commodity.isActive}
        listHref={LIST}
        onActivate={() => activateCommodity(id).unwrap()}
        onDeactivate={() => deactivateCommodity(id).unwrap()}
        onDelete={() => deleteCommodity(id).unwrap()}
      />
    </div>
  );
}
