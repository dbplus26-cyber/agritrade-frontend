"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  EditableFormActions,
  SectionHeading,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { RecordFacts } from "@/components/admin/record-facts";
import { FormSkeleton } from "@/components/admin/skeletons";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useActivateSupplierMutation,
  useCreateSupplierMutation,
  useDeactivateSupplierMutation,
  useDeleteSupplierMutation,
  useGetSupplierQuery,
  useUpdateSupplierMutation,
} from "@/redux/suppliers/suppliers-api";
import {
  PhotoViewDialog,
  ViewablePhoto,
} from "@/components/admin/photo-view";
import { useEditableRecordForm } from "@/hooks/use-editable-record-form";
import { usePhotoStaging } from "@/hooks/use-photo-staging";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { PurchaseSource, type ISupplier } from "@/types/registry.types";
import {
  supplierSchema,
  type SupplierValues,
} from "@/validations/registry-schema";
import {
  RailCard,
  RailStatus,
  RecordShell,
} from "@/components/admin/record-shell";
import { LifecycleActions } from "./lifecycle-actions";
import { SOURCE_LABEL } from "./registry-bits";
import { RecordTimestamps, RegistryAvatar } from "./supplier-table";

const LIST = "/admin/suppliers";

const SOURCE_OPTIONS = [
  PurchaseSource.INDIVIDUAL,
  PurchaseSource.COMPANY,
  PurchaseSource.AGENT,
] as const;

/** "" for create, or the record's values for edit. */
const toSupplierValues = (supplier?: ISupplier): SupplierValues => ({
  name: supplier?.name ?? "",
  altPhone: supplier?.altPhone ?? "",
  phone: supplier?.phone ?? "",
  community: supplier?.community ?? "",
  sourceType: supplier?.sourceType ?? PurchaseSource.INDIVIDUAL,
  notes: supplier?.notes ?? "",
  email: supplier?.email ?? "",
  address: supplier?.address ?? "",
  idNumber: supplier?.idNumber ?? "",
  bankName: supplier?.bankName ?? "",
  bankAccountNumber: supplier?.bankAccountNumber ?? "",
  momoNumber: supplier?.momoNumber ?? "",
});

function SupplierFormFields({ supplier }: { supplier?: ISupplier }) {
  const router = useRouter();
  const isEdit = supplier !== undefined;
  const [createSupplier, createState] = useCreateSupplierMutation();
  const [updateSupplier, updateState] = useUpdateSupplierMutation();
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
  } = usePhotoStaging(supplier?.photoUrl);
  const [viewPhoto, setViewPhoto] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<SupplierValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: toSupplierValues(supplier),
  });

  // The sync callback tracks a record bumped by a background refetch (another
  // tab, a lifecycle action) while reading; the hook never runs it during an
  // in-progress edit, which is why the parent no longer key-remounts the form
  // on updatedAt. It also drops any staged file from the native input, so
  // re-picking the same photo later still fires onChange.
  const { isEditing, setIsEditing, readOnly, roCls, mode } =
    useEditableRecordForm(supplier, () => {
      reset(toSupplierValues(supplier));
      clearPhotoInput();
    });
  const watchedName = useWatch({ control, name: "name" });
  const avatarName = watchedName || supplier?.name || "";

  const onSubmit = async (values: SupplierValues) => {
    const opt = (v: string | undefined) => {
      const trimmed = v?.trim() ?? "";
      if (trimmed) return trimmed;
      return isEdit ? null : undefined;
    };
    try {
      if (isEdit) {
        await updateSupplier({
          id: supplier.id,
          body: {
            name: values.name,
            altPhone: opt(values.altPhone),
            phone: opt(values.phone),
            community: opt(values.community),
            sourceType: values.sourceType,
            notes: opt(values.notes),
            email: opt(values.email),
            address: opt(values.address),
            idNumber: opt(values.idNumber),
            bankName: opt(values.bankName),
            bankAccountNumber: opt(values.bankAccountNumber),
            momoNumber: opt(values.momoNumber),
            ...(removePhoto && !photoFile
              ? { removePhoto: true }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        // Dropping back to read mode lets the sync callback adopt the fresh
        // values.
        resetPhoto();
        notify.success("Supplier updated");
        setIsEditing(false);
      } else {
        const res = await createSupplier({
          body: {
            name: values.name,
            ...(values.phone?.trim() ? { phone: values.phone.trim() } : {}),
            ...(values.altPhone?.trim()
              ? { altPhone: values.altPhone.trim() }
              : {}),
            ...(values.community?.trim()
              ? { community: values.community.trim() }
              : {}),
            sourceType: values.sourceType,
            ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
            ...(values.email?.trim() ? { email: values.email.trim() } : {}),
            ...(values.address?.trim()
              ? { address: values.address.trim() }
              : {}),
            ...(values.idNumber?.trim()
              ? { idNumber: values.idNumber.trim() }
              : {}),
            ...(values.bankName?.trim()
              ? { bankName: values.bankName.trim() }
              : {}),
            ...(values.bankAccountNumber?.trim()
              ? { bankAccountNumber: values.bankAccountNumber.trim() }
              : {}),
            ...(values.momoNumber?.trim()
              ? { momoNumber: values.momoNumber.trim() }
              : {}),
          },
          photo: photoFile ?? undefined,
        }).unwrap();
        notify.success("Supplier created");
        router.replace(`${LIST}/${res.data.supplier.id}`);
      }
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "name",
          "phone",
          "altPhone",
          "community",
          "notes",
          "email",
          "address",
          "idNumber",
          "bankName",
          "bankAccountNumber",
          "momoNumber",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        isEdit ? "Couldn't update the supplier" : "Couldn't create the supplier",
        { description: message },
      );
    }
  };

  // At rest an existing record READS. The form is what you get after
  // pressing Edit, not a greyed-out copy of the page you were already on.
  if (isEdit && !isEditing && supplier) {
    return (
      <AdminCard className="max-w-[640px] px-5 py-[18px]">
        {/* The photograph belongs on the READ view, not only behind Edit.
            It was rendered inside the form, so at rest - which is how this
            page is nearly always seen - the record showed no picture at all,
            and the only way to look at one was to start editing. */}
        <div className="mb-4 flex items-center gap-3.5 border-b border-adm-hairline pb-4">
          <ViewablePhoto
            name={supplier.name}
            size={64}
            src={supplier.photoUrl}
          />
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
              {supplier.name}
            </div>
            <div className="text-[12px] text-adm-muted">
              {supplier.photoUrl ? "Tap the photo to see it in full" : "No photo on file"}
            </div>
          </div>
        </div>
        <RecordFacts
          facts={[
            { mono: true, label: "Phone", value: supplier.phone },
            { mono: true, label: "Other phone", value: supplier.altPhone },
            { label: "Community", value: supplier.community },
            { label: "Email", value: supplier.email },
            { mono: true, label: "ID number", value: supplier.idNumber },
            { full: true, label: "Address", value: supplier.address },
            { label: "Bank name", value: supplier.bankName },
            { mono: true, label: "Bank account number", value: supplier.bankAccountNumber },
            { mono: true, label: "Mobile money number", value: supplier.momoNumber },
            { full: true, label: "Notes", value: supplier.notes },
          ]}
        />
        <div className="mt-4 flex justify-end">
          <AdminButton onClick={() => setIsEditing(true)} type="button">
            Edit supplier
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
              name={avatarName || "Supplier photo"}
              open={viewPhoto}
              onOpenChange={setViewPhoto}
            />
          ) : null}
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. Ibrahim Fuseini"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField
              label="Source type"
              hint="Individual farmer, corporate seller, or an agent-recorded source."
            >
              <Controller
                control={control}
                name="sourceType"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={readOnly}
                  >
                    <SelectTrigger className={cn(adminSelectClass, roCls, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((source) => (
                        <SelectItem key={source} value={source}>
                          {SOURCE_LABEL[source]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </AdminField>
            <AdminField
              label="ID number"
              optional
              hint="Ghana Card or another official ID."
              error={errors.idNumber?.message}
            >
              <Input
                placeholder="e.g. GHA-000000000-0"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.idNumber && "border-console-red",
                )}
                {...register("idNumber")}
              />
            </AdminField>
          </div>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading
            className="mb-0"
            hint="Every way of reaching this supplier, and where they are."
          >
            How to reach them
          </SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                type="tel"
                placeholder="e.g. 024 000 0000"
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
                placeholder="e.g. 055 000 0000"
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
                placeholder="e.g. ibrahim@example.com"
                disabled={readOnly}
                className={cn(adminInputClass, roCls, errors.email && "border-console-red")}
                {...register("email")}
              />
            </AdminField>
            <AdminField
              label="Community"
              optional
              error={errors.community?.message}
            >
              <Input
                placeholder="e.g. Savelugu"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.community && "border-console-red",
                )}
                {...register("community")}
              />
            </AdminField>
          </div>
          <AdminField label="Address" optional error={errors.address?.message}>
            <Input
              placeholder="e.g. House No. 12, Savelugu"
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
            hint="Where money owed to this supplier is sent."
          >
            Payout details
          </SectionHeading>
          <div className="grid gap-[13px] @min-[440px]:grid-cols-2">
            <AdminField label="Bank name" optional error={errors.bankName?.message}>
              <Input
                placeholder="e.g. GCB Bank"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  errors.bankName && "border-console-red",
                )}
                {...register("bankName")}
              />
            </AdminField>
            <AdminField
              label="Bank account number"
              optional
              error={errors.bankAccountNumber?.message}
            >
              <Input
                inputMode="numeric"
                placeholder="e.g. 1234567890123"
                disabled={readOnly}
                className={cn(
                  adminInputClass,
                  roCls,
                  "font-adminmono",
                  errors.bankAccountNumber && "border-console-red",
                )}
                {...register("bankAccountNumber")}
              />
            </AdminField>
          </div>
          <AdminField
            label="Mobile money number"
            optional
            error={errors.momoNumber?.message}
          >
            <Input
              type="tel"
              placeholder="e.g. 024 000 0000"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.momoNumber && "border-console-red",
              )}
              {...register("momoNumber")}
            />
          </AdminField>
        </section>

        <section className="flex flex-col gap-[13px] border-t border-adm-hairline pt-5">
          <SectionHeading className="mb-0">Anything else</SectionHeading>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <textarea
              rows={4}
              placeholder="e.g. Prefers payment by bank transfer"
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
            createLabel="Create supplier"
            editLabel="Edit supplier"
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

export function SupplierCreate() {
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All suppliers"
      header={
        <AdminPageHeader
          title="Add supplier"
          hint="Someone you buy grain from."
          sub="A person or company the business buys from"
        />
      }
    >
      <SupplierFormFields />
    </RecordShell>
  );
}

export function SupplierEdit({ id }: { id: string }) {
  const { data, isLoading, isError, error, refetch } = useGetSupplierQuery(id);
  const [activate] = useActivateSupplierMutation();
  const [deactivate] = useDeactivateSupplierMutation();
  const [remove] = useDeleteSupplierMutation();

  if (isLoading) return <FormSkeleton fields={10} />;
  if (isError || !data)
    return (
      <ErrorMessage
        description={extractApiError(error).message}
        onRetry={() => void refetch()}
      />
    );

  const supplier = data.data.supplier;
  return (
    <RecordShell
      backHref={LIST}
      backLabel="All suppliers"
      header={
        <AdminPageHeader
          title="Supplier details"
          hint="One person or co-op you buy from, and everything bought from them."
        />
      }
      aside={
        <>
          <RailStatus isActive={supplier.isActive} />
          <RailCard title="Filed">
            <RecordTimestamps
              createdAt={supplier.createdAt}
              updatedAt={supplier.updatedAt}
            />
          </RailCard>
          <RailCard title="Lifecycle">
            <LifecycleActions
              noun="supplier"
              name={supplier.name}
              isActive={supplier.isActive}
              listHref={LIST}
              onActivate={() => activate(id).unwrap()}
              onDeactivate={() => deactivate(id).unwrap()}
              onDelete={() => remove(id).unwrap()}
            />
          </RailCard>
        </>
      }
    >
      <SupplierFormFields supplier={supplier} />
    </RecordShell>
  );
}
