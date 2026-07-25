"use client";

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InputItemValues>({
    resolver: zodResolver(inputItemSchema),
    defaultValues: item
      ? { name: item.name, unitLabel: item.unitLabel }
      : { name: "", unitLabel: "" },
  });

  const onSubmit = async (values: InputItemValues) => {
    try {
      if (item) {
        await updateItem({ id: item.id, body: values }).unwrap();
        notify.success("Item updated");
      } else {
        await createItem(values).unwrap();
        notify.success("Item created");
      }
      router.push(LIST);
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

  return (
    <div className="max-w-[520px]">
      <BackButton href={LIST} label="All items" className="mb-2" />
      <AdminPageHeader
        title={item ? "Edit item" : "New input item"}
        actions={item ? <ActiveBadge active={item.isActive} /> : undefined}
      />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2">
          <AdminField label="Name" error={errors.name?.message}>
            <Input
              placeholder="NPK fertiliser"
              className={cn(adminInputClass, errors.name && "border-error")}
              {...register("name")}
            />
          </AdminField>
          <AdminField label="Unit" error={errors.unitLabel?.message}>
            <Input
              placeholder="bag"
              className={cn(adminInputClass, errors.unitLabel && "border-error")}
              {...register("unitLabel")}
            />
          </AdminField>
        </AdminCard>

        <div className="flex flex-wrap justify-end gap-2">
          {item ? (
            <>
              <AdminButton
                type="button"
                variant="outline"
                className="mr-auto h-10 px-4 text-console-red"
                disabled={deleteState.isLoading}
                onClick={() => void onDelete()}
              >
                Delete
              </AdminButton>
              <AdminButton
                type="button"
                variant="outline"
                className="h-10 px-4"
                onClick={() =>
                  void run(
                    () => setActive({ active: !item.isActive, id: item.id }).unwrap(),
                    item.isActive ? "Item deactivated" : "Item activated",
                  )
                }
              >
                {item.isActive ? "Deactivate" : "Activate"}
              </AdminButton>
            </>
          ) : null}
          <AdminButton type="submit" disabled={saving} className="h-10 px-5">
            {saving ? "Saving…" : item ? "Save changes" : "Create item"}
          </AdminButton>
        </div>
      </form>

      {confirmationDialog}
    </div>
  );
}
