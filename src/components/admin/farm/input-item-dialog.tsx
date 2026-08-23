"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
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
import { useCreateInputItemMutation } from "@/redux/farm/input-items-api";
import {
  inputItemSchema,
  type InputItemValues,
} from "@/validations/farm-schema";

const LIST = "/admin/input-items";

/**
 * Adding an input item: a name, the unit it is issued in, and a note.
 *
 * Three fields, so the register asks for them where the register is rather
 * than on a page of its own. A dialog on a desktop, a sheet from the bottom
 * edge on a phone.
 */
export function InputItemDialog({
  onClose,
  open,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const router = useRouter();
  const [createItem, { isLoading }] = useCreateInputItemMutation();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InputItemValues>({
    resolver: zodResolver(inputItemSchema),
    defaultValues: { description: "", name: "", unitLabel: "" },
  });

  const close = () => {
    reset();
    onClose();
  };

  const onSubmit = async (values: InputItemValues) => {
    const description = values.description?.trim() ?? "";
    try {
      const res = await createItem({
        name: values.name,
        unitLabel: values.unitLabel,
        ...(description ? { description } : {}),
      }).unwrap();
      notify.success("Item created");
      close();
      // Straight to the record: an item is added in order to grant it.
      router.push(`${LIST}/${res.data.item.id}/edit`);
    } catch (err) {
      const { fieldErrors, hasFieldErrors, message } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of ["name", "unitLabel", "description"] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't create the item", { description: message });
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={(o) => !o && close()}>
      <ResponsiveDialogContent className="sm:max-w-[520px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>New input item</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Something granted to a farmer against the harvest: fertiliser,
            seed, a sprayer.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminField label="Name" error={errors.name?.message}>
              <Input
                autoFocus
                placeholder="e.g. NPK 15-15-15"
                className={cn(
                  adminInputClass,
                  errors.name && "border-console-red",
                )}
                {...register("name")}
              />
            </AdminField>
            <AdminField
              label="Unit"
              hint="How one of it is counted, so a grant of 4 reads as 4 of something."
              error={errors.unitLabel?.message}
            >
              <Input
                placeholder="e.g. 50kg bag"
                className={cn(
                  adminInputClass,
                  errors.unitLabel && "border-console-red",
                )}
                {...register("unitLabel")}
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
              placeholder="e.g. Top dressing, applied four weeks after planting"
              className={cn(
                adminInputClass,
                "h-auto min-h-[62px] w-full resize-y py-2",
                errors.description && "border-console-red",
              )}
              {...register("description")}
            />
          </AdminField>
          <ResponsiveDialogFooter className="gap-2">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={close}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              size="lg"
            >
              {isLoading ? "Saving…" : "Create item"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
