"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  useActivateBuyerMutation,
  useCreateBuyerMutation,
  useDeactivateBuyerMutation,
  useDeleteBuyerMutation,
  useGetBuyerQuery,
  useUpdateBuyerMutation,
} from "@/redux/buyers/buyers-api";
import {
  PhotoViewDialog,
  ViewablePhoto,
} from "@/components/admin/photo-view";
import { useEditableRecordForm } from "@/hooks/use-editable-record-form";
import { usePhotoStaging } from "@/hooks/use-photo-staging";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { IBuyer } from "@/types/registry.types";
import { buyerSchema, type BuyerValues } from "@/validations/registry-schema";
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
import { LifecycleActions } from "./lifecycle-actions";
import { RecordTimestamps, RegistryAvatar } from "./supplier-table";

const LIST = "/admin/buyers";

/** "" for create, or the record's values for edit. */
const toBuyerValues = (buyer?: IBuyer): BuyerValues => ({
  name: buyer?.name ?? "",
  altPhone: buyer?.altPhone ?? "",
  phone: buyer?.phone ?? "",
  email: buyer?.email ?? "",
  city: buyer?.city ?? "",
  notes: buyer?.notes ?? "",
  address: buyer?.address ?? "",
  businessName: buyer?.businessName ?? "",
  registrationNumber: buyer?.registrationNumber ?? "",
  contactPersonName: buyer?.contactPersonName ?? "",
  contactPersonPhone: buyer?.contactPersonPhone ?? "",
});

function BuyerFormFields({ buyer }: { buyer?: IBuyer }) {
  const router = useRouter();
  const isEdit = buyer !== undefined;
  const [createBuyer, createState] = useCreateBuyerMutation();
  const [updateBuyer, updateState] = useUpdateBuyerMutation();
  const saving = createState.isLoading || updateState.isLoading;

  // Photo travels WITH the save (multipart payload + file, the profile-photo
  // convention); `removePhoto` clears an existing one server-side.
  const {
    fileInputRef,
    photoFile,
    removePhoto,
    previewUrl,
    onPickFile,
    onRemove: onRemovePhoto,
    reset: resetPhoto,
    clearInput: clearPhotoInput,
  } = usePhotoStaging(buyer?.photoUrl);
  const [viewPhoto, setViewPhoto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<BuyerValues>({
    resolver: zodResolver(buyerSchema),
    defaultValues: toBuyerValues(buyer),
  });

  // The sync callback tracks a record bumped by a background refetch (another
  // tab, a lifecycle action) while reading; the hook never runs it during an
  // in-progress edit, which is why the parent no longer key-remounts the form
  // on updatedAt. It also drops any staged file from the native input, so
  // re-picking the same photo later still fires onChange.
  const { isEditing, setIsEditing, readOnly, roCls, mode } =
    useEditableRecordForm(buyer, () => {
      reset(toBuyerValues(buyer));
      clearPhotoInput();
    });
  const watchedName = useWatch({ control, name: "name" });
  const avatarName = watchedName || buyer?.name || "";

  const onSubmit = async (values: BuyerValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateBuyer({
          id: buyer.id,
          body: {
            name: values.name,
            altPhone: opt(values.altPhone),
            phone: opt(values.phone),
            email: opt(values.email),
            city: opt(values.city),
            notes: opt(values.notes),
            address: opt(values.address),
            businessName: opt(values.businessName),
            registrationNumber: opt(values.registrationNumber),
            contactPersonName: opt(values.contactPersonName),
            contactPersonPhone: opt(values.contactPersonPhone),
            ...(removePhoto && !photoFile
              ? { removePhoto: true }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        // Dropping back to read mode lets the sync callback adopt the fresh
        // values.
        resetPhoto();
        notify.success("Buyer updated");
        setIsEditing(false);
      } else {
        const res = await createBuyer({
          body: {
            name: values.name,
            ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
            ...(values.altPhone?.trim()
              ? { altPhone: values.altPhone.trim() }
              : {}),
            ...(values.email?.trim() ? { email: values.email.trim() } : {}),
            ...(values.city?.trim() ? { city: values.city.trim() } : {}),
            ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
            ...(values.address?.trim()
              ? { address: values.address.trim() }
              : {}),
            ...(values.businessName?.trim()
              ? { businessName: values.businessName.trim() }
              : {}),
            ...(values.registrationNumber?.trim()
              ? { registrationNumber: values.registrationNumber.trim() }
              : {}),
            ...(values.contactPersonName?.trim()
              ? { contactPersonName: values.contactPersonName.trim() }
              : {}),
            ...(values.contactPersonPhone?.trim()
              ? { contactPersonPhone: values.contactPersonPhone.trim() }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        notify.success("Buyer created");
        router.replace(`${LIST}/${res.data.buyer.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "name",
          "phone",
          "altPhone",
          "email",
          "city",
          "notes",
          "address",
          "businessName",
          "registrationNumber",
          "contactPersonName",
          "contactPersonPhone",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the buyer" : "Couldn't create the buyer",
        { description: message },
      );
    }
  };

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && buyer) {
    return (
      <AdminCard className="max-w-[640px] px-5 py-[18px]">
        {/* The photograph belongs on the READ view, not only behind Edit.
            It was rendered inside the form, so at rest - which is how this
            page is nearly always seen - the record showed no picture at all,
            and the only way to look at one was to start editing. */}
        <div className="mb-4 flex items-center gap-3.5 border-b border-adm-hairline pb-4">
          <ViewablePhoto
            name={buyer.name}
            size={64}
            src={buyer.photoUrl}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
              {buyer.name}
            </div>
            <div className="text-[12px] text-adm-muted">
              {buyer.photoUrl ? "Tap the photo to see it in full" : "No photo on file"}
            </div>
          </div>
        </div>
        <RecordFacts
          facts={[
            { mono: true, label: "Phone", value: buyer.phone },
            { mono: true, label: "Other phone", value: buyer.altPhone },
            { label: "City", value: buyer.city },
            { label: "Email", value: buyer.email },
            { full: true, label: "Address", value: buyer.address },
            { label: "Business name", value: buyer.businessName },
            { mono: true, label: "Registration number", value: buyer.registrationNumber },
            { label: "Contact person", value: buyer.contactPersonName },
            { mono: true, label: "Contact phone", value: buyer.contactPersonPhone },
            { full: true, label: "Notes", value: buyer.notes },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit buyer
          </AdminButton>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="max-w-[640px] px-5 py-[18px]">
      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` paired fields up while
          the column was still too narrow to carry two of them. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <section className="flex flex-col gap-[13px]">
          <SectionHeading className="mb-0">Who they are</SectionHeading>
          {/* Not an AdminField: the control is a button, and a <label> around
              a button misroutes its clicks. Same label markup as AdminField so
              it stays in step with the fields under it. */}
          <div>
            <span className="mb-1 block text-[13px] font-semibold text-adm-ink">
              Photo <span className="font-normal text-adm-faint">(optional)</span>
            </span>
            <div className="flex flex-wrap items-center gap-3.5">
              {previewUrl && readOnly ? (
                <button
                  type="button"
                  onClick={() => setViewPhoto(true)}
                  aria-label="View photo"
                  title="View photo"
                  className="cursor-zoom-in rounded-full outline-none focus-visible:ring-2 focus-visible:ring-console/40"
                >
                  <RegistryAvatar
                    name={avatarName}
                    photoUrl={previewUrl}
                    size={64}
                  />
                </button>
              ) : (
                <RegistryAvatar
                  name={avatarName}
                  photoUrl={previewUrl}
                  size={64}
                />
              )}
              {isEditing ? (
                <div className="flex flex-wrap gap-2">
                  <AdminButton
                    type="button"
                    variant="secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? "Change photo" : "Add photo"}
                  </AdminButton>
                  {previewUrl ? (
                    <AdminButton
                      type="button"
                      variant="outline"
                      onClick={onRemovePhoto}
                    >
                      Remove photo
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
                  if (file) void onPickFile(file);
                }}
              />
            </div>
          </div>
          {previewUrl ? (
            <PhotoViewDialog
              src={previewUrl}
              name={avatarName || "Buyer photo"}
              open={viewPhoto}
              onOpenChange={setViewPhoto}
            />
          ) : null}
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. Accra Grain Traders"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading
            className="mb-0"
            hint="Every way of reaching this buyer, and where they take delivery."
          >
            How to reach them
          </SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                type="tel"
                placeholder="e.g. 055 000 0000"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.phone && "border-console-red")}
                {...register("phone")}
              />
            </AdminField>
            {/* A second line reaching the SAME person. Traders here carry two
                networks, and the number on file is the one that is off when a
                truck is at the gate. */}
            <AdminField
              label="Other phone"
              optional
              error={errors.altPhone?.message}
            >
              <Input
                type="tel"
                placeholder="e.g. 024 000 0000"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.altPhone && "border-console-red",
                )}
                {...register("altPhone")}
              />
            </AdminField>
            <AdminField label="Email" optional error={errors.email?.message}>
              <Input
                type="email"
                placeholder="e.g. orders@accragrain.com"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.email && "border-console-red")}
                {...register("email")}
              />
            </AdminField>
            <AdminField label="City" optional error={errors.city?.message}>
              <Input
                placeholder="e.g. Accra"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.city && "border-console-red")}
                {...register("city")}
              />
            </AdminField>
          </div>
          <AdminField label="Address" optional error={errors.address?.message}>
            <Input
              placeholder="e.g. Plot 5, Spintex Road, Accra"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.address && "border-console-red",
              )}
              {...register("address")}
            />
          </AdminField>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading
            className="mb-0"
            hint="The registered company behind the buyer, and the person who answers for it."
          >
            Business
          </SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField
              label="Business name"
              optional
              error={errors.businessName?.message}
            >
              <Input
                placeholder="e.g. Accra Grain Traders Ltd"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.businessName && "border-console-red",
                )}
                {...register("businessName")}
              />
            </AdminField>
            <AdminField
              label="Registration number"
              optional
              error={errors.registrationNumber?.message}
            >
              <Input
                placeholder="e.g. CS123456789"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  "font-adminmono",
                  errors.registrationNumber && "border-console-red",
                )}
                {...register("registrationNumber")}
              />
            </AdminField>
            <AdminField
              label="Contact person name"
              optional
              error={errors.contactPersonName?.message}
            >
              <Input
                placeholder="e.g. Ama Mensah"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.contactPersonName && "border-console-red",
                )}
                {...register("contactPersonName")}
              />
            </AdminField>
            <AdminField
              label="Contact person phone"
              optional
              error={errors.contactPersonPhone?.message}
            >
              <Input
                type="tel"
                placeholder="e.g. 055 000 0000"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.contactPersonPhone && "border-console-red",
                )}
                {...register("contactPersonPhone")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading className="mb-0">Anything else</SectionHeading>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <textarea
              rows={4}
              placeholder="e.g. Only takes full 30-tonne loads"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "h-auto min-h-[104px] w-full resize-y py-2",
                errors.notes && "border-console-red",
              )}
              {...register("notes")}
            />
          </AdminField>
        </section>

        <div className="border-t border-adm-hairline pt-5">
          <EditableFormActions
            mode={mode}
            saving={saving}
            createLabel="Create buyer"
            editLabel="Edit buyer"
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

export function BuyerCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All buyers"
      header={
        <AdminPageHeader
          title="Add buyer"
          hint="Someone who buys from you. Their payment terms can be set here too."
          sub="A customer the business sells to"
        />
      }
    >
      <BuyerFormFields />
    </RecordShell>
  );
}

export function BuyerEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetBuyerQuery(id);
  const [activate] = useActivateBuyerMutation();
  const [deactivate] = useDeactivateBuyerMutation();
  const [remove] = useDeleteBuyerMutation();

  if (isLoading) return <FormSkeleton fields={10} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const buyer = data.data.buyer;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All buyers"
      header={<AdminPageHeader title={buyer.name} sub="Buyer record" />}
      aside={
        <>
          <RailStatus isActive={buyer.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={buyer.createdAt}
              updatedAt={buyer.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="buyer"
              name={buyer.name}
              isActive={buyer.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <BuyerFormFields buyer={buyer} />
    </RecordShell>
  );
}
