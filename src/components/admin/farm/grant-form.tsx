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
  adminSelectClass,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetFarmersQuery } from "@/redux/farm/farmers-api";
import { useCreateGrantMutation } from "@/redux/farm/grants-api";
import { useGetInputItemsQuery } from "@/redux/farm/input-items-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import { grantSchema, type GrantValues } from "@/validations/farm-schema";

const LIST = "/admin/grants";

/** Record an input grant. `farmerId` may be pre-filled from a farmer's page. */
export function GrantForm({ farmerId }: { farmerId?: string }) {
  const router = useRouter();
  const [createGrant, { isLoading: saving }] = useCreateGrantMutation();
  const farmers = useGetFarmersQuery({ isActive: true, limit: 100 });
  const seasons = useGetSeasonsQuery({ isActive: true, limit: 100 });
  const items = useGetInputItemsQuery({ isActive: true, limit: 100 });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GrantValues>({
    resolver: zodResolver(grantSchema),
    defaultValues: {
      farmerId: farmerId ?? "",
      itemId: "",
      notes: "",
      quantity: "",
      seasonId: "",
      valueGhs: "",
    },
  });

  const onSubmit = async (values: GrantValues) => {
    try {
      await createGrant({
        farmerId: values.farmerId,
        itemId: values.itemId,
        quantity: Number(values.quantity),
        seasonId: values.seasonId,
        valueGhs: Number(values.valueGhs),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Grant recorded");
      router.push(LIST);
    } catch (err) {
      notify.error("Couldn't record the grant", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All grants" className="mb-2" />
      <AdminPageHeader title="New input grant" />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Farmer" error={errors.farmerId?.message}>
            <select
              className={cn(adminSelectClass, "w-full", errors.farmerId && "border-error")}
              {...register("farmerId")}
            >
              <option value="">Choose the farmer</option>
              {(farmers.data?.data ?? []).map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                  {f.community ? ` · ${f.community}` : ""}
                </option>
              ))}
            </select>
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Season" error={errors.seasonId?.message}>
              <select
                className={cn(adminSelectClass, "w-full", errors.seasonId && "border-error")}
                {...register("seasonId")}
              >
                <option value="">Choose the season</option>
                {(seasons.data?.data ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Input item" error={errors.itemId?.message}>
              <select
                className={cn(adminSelectClass, "w-full", errors.itemId && "border-error")}
                {...register("itemId")}
              >
                <option value="">Choose the item</option>
                {(items.data?.data ?? []).map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} ({i.unitLabel})
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Quantity" error={errors.quantity?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.quantity && "border-error")}
                {...register("quantity")}
              />
            </AdminField>
            <AdminField label="Value (GHS)" error={errors.valueGhs?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.valueGhs && "border-error")}
                {...register("valueGhs")}
              />
            </AdminField>
          </div>
          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
        </AdminCard>

        <p className="text-[12px] text-soil">
          A grant at or above the owner-set threshold records immediately but is
          flagged for approval.
        </p>

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
            {saving ? "Saving…" : "Record grant"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
