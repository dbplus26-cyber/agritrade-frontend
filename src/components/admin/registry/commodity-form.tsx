"use client";

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
  SectionHeading,
  adminInputClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { BackButton } from "@/components/ui/BackButton";
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { ViewablePhoto } from "@/components/admin/photo-view";
import {
  useCreateCommodityMutation,
  useDeactivateCommodityMutation,
  useActivateCommodityMutation,
  useDeleteCommodityMutation,
  useGetCommodityQuery,
  usePublishCommodityMutation,
  useUpdateCommodityMutation,
} from "@/redux/commodities/commodities-api";
import { useEditableRecordForm } from "@/hooks/use-editable-record-form";
import { usePhotoStaging } from "@/hooks/use-photo-staging";
import { extractApiError } from "@/lib/extract-api-error";
import { COMMODITY_DESCRIPTION_MAX, COMMODITY_NAME_MAX } from "@/lib/limits";
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

  // Photo travels WITH the save (multipart payload + file, the profile-photo
  // convention); `removePhoto` clears an existing one server-side.
  const {
    fileInputRef,
    photoFile,
    removePhoto,
    previewUrl,
    onSelectFile,
    onRemove: onRemovePhoto,
    reset: resetPhoto,
    clearInput: clearPhotoInput,
  } = usePhotoStaging(commodity?.photo);

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

  // The sync callback tracks a record bumped by a background refetch (the
  // publish toggle on this very page, another tab) while reading; the hook
  // never runs it during an in-progress edit, which is why the parent does
  // not key-remount the form on updatedAt. It also drops any staged file from
  // the native input, so re-picking the same photo later still fires onChange.
  const { isEditing, setIsEditing, readOnly, roCls, mode } =
    useEditableRecordForm(commodity, () => {
      reset(toFormValues(commodity));
      clearPhotoInput();
    });

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
      ...(isEdit && removePhoto && !photoFile
        ? { removePhoto: true }
        : {}),
    };

    try {
      if (isEdit) {
        await updateCommodity({
          id: commodity.id,
          body,
          photo: photoFile ?? undefined,
        }).unwrap();
        // Dropping back to read mode lets the sync callback adopt the fresh
        // values.
        resetPhoto();
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

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && commodity) {
    return (
      <AdminCard className="px-5 py-[18px]">
        <RecordFacts
          facts={[
            { label: "Name", value: commodity.name },
            { label: "Variety", value: commodity.variety },
            { label: "Quality grade", value: commodity.qualityGrade },
            {
              label: "Bag weight",
              mono: true,
              value:
                commodity.bagWeightKg === null
                  ? null
                  : `${String(commodity.bagWeightKg)} kg`,
            },
            {
              label: "Sort order",
              mono: true,
              value: String(commodity.sortOrder),
            },
            { full: true, label: "Description", value: commodity.description },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit commodity
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="px-5 py-[18px]">
      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` paired fields up while
          the column was still too narrow to carry two of them. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <section className="flex flex-col gap-[13px]">
          <SectionHeading className="mb-0">What it is</SectionHeading>
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. White Maize"
              disabled={readOnly}
              maxLength={COMMODITY_NAME_MAX}
              className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
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
                  errors.variety && "border-console-red",
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
                  errors.qualityGrade && "border-console-red",
                )}
                {...register("qualityGrade")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading
            className="mb-0"
            hint="Conventions the console uses when it shows this commodity: nothing here changes how stock is counted."
          >
            Measurement and order
          </SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
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
                  errors.bagWeightKg && "border-console-red",
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
                placeholder="e.g. 10"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  "font-adminmono",
                  errors.sortOrder && "border-console-red",
                )}
                {...register("sortOrder")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading
            className="mb-0"
            hint="What the public site shows for this commodity once it is published."
          >
            On the website
          </SectionHeading>
          <AdminField
            label="Description"
            optional
            error={errors.description?.message}
          >
            <textarea
              rows={4}
              maxLength={COMMODITY_DESCRIPTION_MAX}
              placeholder="e.g. Clean, sun-dried white maize from the Northern Region"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "h-auto min-h-[104px] w-full resize-y py-2",
                errors.description && "border-console-red",
              )}
              {...register("description")}
            />
          </AdminField>

          {/* Not an AdminField: the control is a button, and a <label> around a
              button misroutes its clicks. Same label/hint markup as AdminField
              so it stays in step with the fields above it. */}
          <div>
            <span className="mb-1 block text-[13px] font-semibold text-adm-ink">
              Photo <span className="font-normal text-adm-faint">(optional)</span>
            </span>
            <span className="mb-1.5 block text-[12px] leading-[1.5] font-normal text-adm-muted">
              Used on the website&apos;s commodity card. JPG or PNG.
            </span>
            <div className="flex flex-wrap items-center gap-3">
              {/* At REST this is the record's picture, not an upload control.
                  The page opens read-only, and a 56px inert thumbnail beside a
                  "Choose photo" button read as a file field that had already
                  been filled in - so the one screen that should show what a
                  commodity looks like was the one screen that did not. It only
                  becomes a picker preview once Edit is pressed. */}
              {readOnly ? (
                <ViewablePhoto
                  className="rounded-[6px]"
                  name={commodity?.name ?? "Commodity"}
                  size={96}
                  src={previewUrl}
                />
              ) : previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview
                <img
                  src={previewUrl}
                  alt="Commodity photo"
                  className="h-14 w-14 flex-none rounded-[4px] border border-adm-line object-cover"
                />
              ) : (
                <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[4px] border border-dashed border-adm-line text-[10px] text-adm-faint">
                  No photo
                </span>
              )}
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? "Replace photo" : "Choose photo"}
                  </AdminButton>
                  {previewUrl ? (
                    <AdminButton
                      type="button"
                      variant="outline"
                      onClick={onRemovePhoto}
                    >
                      Remove
                    </AdminButton>
                  ) : null}
                </div>
              ) : null}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void optimizeImage(file).then(onSelectFile);
                }}
              />
            </div>
          </div>
        </section>

        <div className="border-t border-adm-hairline pt-5">
          <EditableFormActions
            mode={mode}
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
              resetPhoto();
              setIsEditing(false);
            }}
          />
        </div>
      </form>
    </AdminCard>
  );
}

/** Create screen. */
export function CommodityCreate() {
  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All commodities" className="mb-2" />
      <AdminPageHeader
        title="Add commodity"
        hint="A crop you trade in. It then appears wherever a commodity is chosen."
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

  if (isLoading) return <FormSkeleton fields={6} />;
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
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All commodities" className="mb-2" />
      <AdminPageHeader
        title="Commodity details"
        hint="One crop, and whether it is shown on the public website."
        sub="Edit the commodity, its website visibility and lifecycle"
      />
      <CommodityFormFields commodity={commodity} />

      <AdminCard className="mt-4 px-5 py-4">
        <label className="flex cursor-pointer items-center justify-between gap-3">
          <span>
            <span className="block text-[13px] font-semibold text-adm-ink">
              Show on website
            </span>
            <span className="block text-[12px] text-adm-muted">
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
