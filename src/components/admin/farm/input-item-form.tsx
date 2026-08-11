"use client";

import { Fragment, useEffect, useState } from "react";
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
import { ActiveBadge } from "./farm-bits";
import { RecordFacts } from "@/components/admin/record-facts";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { useConfirm } from "@/hooks/use-confirm";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateInputItemMutation,
  useDeleteInputItemMutation,
  useSetInputItemActiveMutation,
  useUpdateInputItemMutation,
} from "@/redux/farm/input-items-api";
import type { IInputItem } from "@/types/farm.types";
import { inputItemSchema, type InputItemValues } from "@/validations/farm-schema";

const LIST = "/admin/input-items";

export function InputItemForm({ item }: { item?: IInputItem }) {
  const router = useRouter();
  const [createItem, createState] = useCreateInputItemMutation();
  const [updateItem, updateState] = useUpdateInputItemMutation();
  const [setActive] = useSetInputItemActiveMutation();
  const [deleteItem, deleteState] = useDeleteInputItemMutation();
  const { confirm, confirmationDialog } = useConfirm();
  const saving = createState.isLoading || updateState.isLoading;

  // Edit opens READ-ONLY; the Edit button unlocks the inputs. Create is
  // always editable.
  const [isEditing, setIsEditing] = useState(item === undefined);
  const readOnly = !isEditing;
  // Keep disabled inputs legible as a read view rather than a greyed-out form.
  const roCls = readOnly ? "disabled:cursor-default disabled:opacity-100" : "";

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InputItemValues>({
    resolver: zodResolver(inputItemSchema),
    defaultValues: item
      ? {
          description: item.description ?? "",
          name: item.name,
          unitLabel: item.unitLabel,
        }
      : { description: "", name: "", unitLabel: "" },
  });

  // A background refetch can bump the record (e.g. the activate/deactivate
  // actions below). Track the fresh values while reading, but never clobber
  // an in-progress edit.
  useEffect(() => {
    if (item && !isEditing)
      reset({
        description: item.description ?? "",
        name: item.name,
        unitLabel: item.unitLabel,
      });
  }, [item, isEditing, reset]);

  const onSubmit = async (values: InputItemValues) => {
    try {
      // Empty clears the column on an edit; on a create it is simply omitted.
      const description = values.description?.trim() ?? "";
      if (item) {
        await updateItem({
          id: item.id,
          body: { ...values, description: description || null },
        }).unwrap();
        notify.success("Item updated");
        // This screen doubles as the item's read view - drop back into it.
        setIsEditing(false);
      } else {
        await createItem({
          ...values,
          ...(description ? { description } : {}),
        }).unwrap();
        notify.success("Item created");
        router.push(LIST);
      }
    } catch (err) {
      notify.error("Couldn't save the item", {
        description: extractApiError(err).message,
      });
    }
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify.success(ok);
    } catch (err) {
      notify.error("Something went wrong", {
        description: extractApiError(err).message,
      });
    }
  };

  const onDelete = async () => {
    if (!item) return;
    const ok = await confirm({
      title: "Delete this item?",
      description: "Only possible while no grant references it.",
      confirmText: "Delete",
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteItem(item.id).unwrap();
      notify.success("Item deleted");
      router.push(LIST);
    } catch (err) {
      notify.error("Couldn't delete the item", {
        description: extractApiError(err).message,
      });
    }
  };

  // At rest an existing record READS; the form appears only on Edit.
  if (item && !isEditing) {
    return (
      <div className="max-w-[640px]">
        <BackButton href={LIST} label="All items" className="mb-2" />
        <AdminPageHeader
          title="Input item details"
          hint="One thing you advance to farmers, such as seed or fertiliser."
          sub={"An input the programme grants to farmers - what it is, and the unit it is issued in"}
          actions={<ActiveBadge active={item.isActive} />}
        />
        <AdminCard className="px-5 py-4">
          <RecordFacts
            facts={[
              { label: "Name", value: item.name },
              { label: "Unit", value: item.unitLabel },
              { full: true, label: "Description", value: item.description },
            ]}
          />
          <div className="mt-4 flex justify-end">
            <AdminButton onClick={() => setIsEditing(true)} type="button">
              Edit item
            </AdminButton>
          </div>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All items" className="mb-2" />
      <AdminPageHeader
        title={item ? "Edit item" : "New input item"}
        sub="An input the programme grants to farmers - what it is, and the unit it is issued in"
        actions={item ? <ActiveBadge active={item.isActive} /> : undefined}
      />

      {/* The name/unit pair measures against this form, not the viewport: the
          console shell keeps a ~225px rail beside it, so `sm:` paired them up
          while the column was still too narrow to carry two. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-5"
      >
        <AdminCard className="grid grid-cols-1 gap-5 px-5 py-4 @min-[440px]:grid-cols-2">
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="e.g. NPK fertiliser"
              disabled={readOnly}
              className={cn(adminInputClass, roCls, errors.name && "border-console-red")}
              {...register("name")}
            />
          </AdminField>
          <AdminField
            error={errors.unitLabel?.message}
            hint="How this item is handed out and counted: a bag, a litre, a piece."
            label="Unit"
          >
            <Input
              placeholder="e.g. bag"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                errors.unitLabel && "border-console-red",
              )}
              {...register("unitLabel")}
            />
          </AdminField>
          {/* Free text needs the room the two short fields above do not:
              span the whole card once the card has two columns. */}
          <AdminField
            label="Description"
            optional
            hint="What it actually is, so a field officer picking it knows - e.g. 'NPK 15-15-15, 50kg bag'."
            error={errors.description?.message}
            className="@min-[440px]:col-span-2"
          >
            <textarea
              rows={4}
              placeholder="e.g. NPK 15-15-15, 50kg bag"
              disabled={readOnly}
              className={cn(
                adminInputClass,
                roCls,
                "h-auto min-h-[84px] w-full resize-y py-2",
                errors.description && "border-console-red",
              )}
              {...register("description")}
            />
          </AdminField>
        </AdminCard>

        {/* This row keeps its own markup rather than EditableFormActions
            because the locked branch also carries Delete and Deactivate. The
            key on every branch is still load-bearing: an unkeyed branch lets
            React reuse the same <button> DOM node across the swap, so
            clicking "Edit item" would flip that very element to
            type="submit" before the browser ran the click's default action
            and the form would PATCH itself while still locked. */}
        <div className="flex flex-wrap justify-end gap-2">
          {item && !isEditing ? (
            <Fragment key="locked">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                className="mr-auto text-console-red"
                disabled={deleteState.isLoading}
                onClick={() => void onDelete()}
              >
                Delete
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() =>
                  void run(
                    () => setActive({ active: !item.isActive, id: item.id }).unwrap(),
                    item.isActive ? "Item deactivated" : "Item activated",
                  )
                }
              >
                {item.isActive ? "Deactivate" : "Activate"}
              </AdminButton>
              <AdminButton
                type="button"
                variant="gold"
                size="lg"
                onClick={() => setIsEditing(true)}
              >
                Edit item
              </AdminButton>
            </Fragment>
          ) : item ? (
            <Fragment key="editing">
              <AdminButton
                type="button"
                variant="outline"
                size="lg"
                onClick={() => {
                  reset();
                  setIsEditing(false);
                }}
              >
                Cancel
              </AdminButton>
              <AdminButton type="submit" disabled={saving} size="lg">
                {saving ? "Saving…" : "Save changes"}
              </AdminButton>
            </Fragment>
          ) : (
            <AdminButton
              key="create"
              type="submit"
              disabled={saving}
              size="lg"
            >
              {saving ? "Saving…" : "Create item"}
            </AdminButton>
          )}
        </div>
      </form>

      {confirmationDialog}
    </div>
  );
}
