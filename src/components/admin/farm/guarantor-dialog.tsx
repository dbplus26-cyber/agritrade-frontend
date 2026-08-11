"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminField,
  adminInputClass,
  SectionHeading,
} from "@/components/admin/ui";
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
import {
  useAddFarmerGuarantorMutation,
  useUpdateFarmerGuarantorMutation,
} from "@/redux/farm/farmers-api";
import type { IFarmerGuarantor, IGuarantorInput } from "@/types/farm.types";
import { guarantorSchema, type GuarantorValues } from "@/validations/farm-schema";

const GUARANTOR_FIELDS = [
  "name",
  "phone",
  "relationship",
  "occupation",
  "idType",
  "idNumber",
  "address",
  "notes",
] as const;

const ID_TYPE_SUGGESTIONS = [
  "Ghana Card",
  "Voter ID",
  "Passport",
  "Driver Licence",
];

/** Add/edit a farmer guarantor. Pass `guarantor` to edit; omit to add. */
export function GuarantorDialog({
  farmerId,
  guarantor,
  onClose,
}: {
  farmerId: string;
  guarantor?: IFarmerGuarantor;
  onClose: () => void;
}) {
  const [addGuarantor, addState] = useAddFarmerGuarantorMutation();
  const [updateGuarantor, updateState] = useUpdateFarmerGuarantorMutation();
  const saving = addState.isLoading || updateState.isLoading;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<GuarantorValues>({
    resolver: zodResolver(guarantorSchema),
    defaultValues: {
      address: guarantor?.address ?? "",
      idNumber: guarantor?.idNumber ?? "",
      idType: guarantor?.idType ?? "",
      name: guarantor?.name ?? "",
      notes: guarantor?.notes ?? "",
      occupation: guarantor?.occupation ?? "",
      phone: guarantor?.phone ?? "",
      relationship: guarantor?.relationship ?? "",
    },
  });

  const onSubmit = async (values: GuarantorValues) => {
    // Empty optional fields are omitted, mirroring the farmer form's shaping.
    const trimmed = (v: string | undefined) => v?.trim() ?? "";
    const body: IGuarantorInput = {
      name: values.name,
      ...(trimmed(values.phone) ? { phone: trimmed(values.phone) } : {}),
      ...(trimmed(values.relationship)
        ? { relationship: trimmed(values.relationship) }
        : {}),
      ...(trimmed(values.occupation)
        ? { occupation: trimmed(values.occupation) }
        : {}),
      ...(trimmed(values.idType) ? { idType: trimmed(values.idType) } : {}),
      ...(trimmed(values.idNumber) ? { idNumber: trimmed(values.idNumber) } : {}),
      ...(trimmed(values.address) ? { address: trimmed(values.address) } : {}),
      ...(trimmed(values.notes) ? { notes: trimmed(values.notes) } : {}),
    };
    try {
      if (guarantor) {
        await updateGuarantor({
          id: farmerId,
          guarantorId: guarantor.id,
          body,
        }).unwrap();
        notify.success("Guarantor updated");
      } else {
        await addGuarantor({ id: farmerId, body }).unwrap();
        notify.success("Guarantor added");
      }
      onClose();
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of GUARANTOR_FIELDS) {
          if (fieldErrors[field]) setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error(
        guarantor ? "Couldn't update the guarantor" : "Couldn't add the guarantor",
        { description: message },
      );
    }
  };

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto border-adm-line p-5 sm:max-w-[640px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-[15px] font-bold text-adm-ink">
            {guarantor ? "Edit guarantor" : "Add guarantor"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-[12.5px] leading-[1.55] text-adm-muted">
            Someone who vouches for the farmer and can be reached if repayment
            stalls.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* Field pairs measure against this form rather than the viewport:
            inside a dialog the sheet is its own width, so a `sm:` pair fires
            on screen size and not on the room the fields actually have. */}
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="@container flex flex-col gap-5"
        >
          <section className="flex flex-col gap-3">
            <SectionHeading className="mb-0">Who they are</SectionHeading>
            <AdminField label="Name" error={errors.name?.message}>
              <Input
                placeholder="e.g. Fuseini Alhassan"
                className={cn(adminInputClass, errors.name && "border-console-red")}
                {...register("name")}
              />
            </AdminField>
            <div className="grid grid-cols-1 gap-3 @min-[440px]:grid-cols-2">
              <AdminField
                label="Relationship"
                optional
                error={errors.relationship?.message}
              >
                <Input
                  placeholder="e.g. Brother"
                  className={cn(adminInputClass, errors.relationship && "border-console-red")}
                  {...register("relationship")}
                />
              </AdminField>
              <AdminField label="Occupation" optional error={errors.occupation?.message}>
                <Input
                  placeholder="e.g. Teacher"
                  className={cn(adminInputClass, errors.occupation && "border-console-red")}
                  {...register("occupation")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-3 pt-3 sm:pt-6">
            <SectionHeading
              className="mb-0"
              hint="The ID you checked, so the person vouching can be identified later."
            >
              Identification
            </SectionHeading>
            <div className="grid grid-cols-1 gap-3 @min-[440px]:grid-cols-2">
              <AdminField label="ID type" optional error={errors.idType?.message}>
                <Input
                  list="guarantor-id-types"
                  placeholder="e.g. Ghana Card"
                  className={cn(adminInputClass, errors.idType && "border-console-red")}
                  {...register("idType")}
                />
                <datalist id="guarantor-id-types">
                  {ID_TYPE_SUGGESTIONS.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </AdminField>
              <AdminField label="ID number" optional error={errors.idNumber?.message}>
                <Input
                  placeholder="e.g. GHA-000000000-0"
                  className={cn(adminInputClass, errors.idNumber && "border-console-red")}
                  {...register("idNumber")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-3 pt-3 sm:pt-6">
            <SectionHeading
              className="mb-0"
              hint="How you would actually reach this person if repayment stalls."
            >
              How to reach them
            </SectionHeading>
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                inputMode="tel"
                placeholder="e.g. 024 000 0000"
                className={cn(adminInputClass, errors.phone && "border-console-red")}
                {...register("phone")}
              />
            </AdminField>
            <AdminField label="Address" optional error={errors.address?.message}>
              <textarea
                rows={4}
                placeholder="e.g. House 12, Kumbungu"
                className={cn(
                  adminInputClass,
                  "h-auto min-h-[60px] w-full resize-y py-2",
                  errors.address && "border-console-red",
                )}
                {...register("address")}
              />
            </AdminField>
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <Input
                placeholder="e.g. Vouched for two other farmers in 2025"
                className={cn(adminInputClass, errors.notes && "border-console-red")}
                {...register("notes")}
              />
            </AdminField>
          </section>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={saving} size="lg">
              {saving
                ? "Saving…"
                : guarantor
                  ? "Save changes"
                  : "Add guarantor"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
