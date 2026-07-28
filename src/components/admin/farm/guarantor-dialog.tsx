"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminField,
  adminInputClass,
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
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto border-soil/25 p-5 sm:max-w-[640px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-[15px] font-bold text-ink">
            {guarantor ? "Edit guarantor" : "Add guarantor"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-[12.5px] leading-[1.55] text-soil">
            Someone who vouches for the farmer and can be reached if repayment
            stalls.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-3"
        >
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="Fuseini Alhassan"
              className={cn(adminInputClass, errors.name && "border-error")}
              {...register("name")}
            />
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Phone" optional error={errors.phone?.message}>
              <Input
                inputMode="tel"
                placeholder="024 000 0000"
                className={cn(adminInputClass, errors.phone && "border-error")}
                {...register("phone")}
              />
            </AdminField>
            <AdminField
              label="Relationship"
              optional
              error={errors.relationship?.message}
            >
              <Input
                placeholder="Brother, chief, neighbour…"
                className={cn(adminInputClass, errors.relationship && "border-error")}
                {...register("relationship")}
              />
            </AdminField>
            <AdminField label="Occupation" optional error={errors.occupation?.message}>
              <Input
                placeholder="Teacher"
                className={cn(adminInputClass, errors.occupation && "border-error")}
                {...register("occupation")}
              />
            </AdminField>
            <AdminField label="ID type" optional error={errors.idType?.message}>
              <Input
                list="guarantor-id-types"
                placeholder="Ghana Card, Voter ID…"
                className={cn(adminInputClass, errors.idType && "border-error")}
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
                placeholder="GHA-000000000-0"
                className={cn(adminInputClass, errors.idNumber && "border-error")}
                {...register("idNumber")}
              />
            </AdminField>
          </div>
          <AdminField label="Address" optional error={errors.address?.message}>
            <textarea
              rows={2}
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
                errors.address && "border-error",
              )}
              {...register("address")}
            />
          </AdminField>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input className={cn(adminInputClass, errors.notes && "border-error")} {...register("notes")} />
          </AdminField>

          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              className="h-9 px-3.5"
              disabled={saving}
              onClick={onClose}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={saving} className="h-9 px-4">
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
