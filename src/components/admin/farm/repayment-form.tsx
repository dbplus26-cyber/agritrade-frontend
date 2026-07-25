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
import { formatCedis } from "@/lib/format-money";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetFarmersQuery } from "@/redux/farm/farmers-api";
import { useGetSeasonsQuery } from "@/redux/farm/seasons-api";
import { useCreateRepaymentMutation } from "@/redux/farm/repayments-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { repaymentSchema, type RepaymentValues } from "@/validations/farm-schema";

const LIST = "/admin/repayments";

/** Record a produce repayment. `farmerId` may be pre-filled from a farmer. */
export function RepaymentForm({ farmerId }: { farmerId?: string }) {
  const router = useRouter();
  const [createRepayment, { isLoading: saving }] = useCreateRepaymentMutation();
  const farmers = useGetFarmersQuery({ isActive: true, limit: 100 });
  const seasons = useGetSeasonsQuery({ isActive: true, limit: 100 });
  const commodities = useGetCommoditiesQuery({ isActive: true, limit: 100 });
  const warehouses = useGetWarehousesQuery({ isActive: true, limit: 100 });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RepaymentValues>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: {
      commodityId: "",
      farmerId: farmerId ?? "",
      intakeWarehouseId: "",
      notes: "",
      ratePerKgGhs: "",
      seasonId: "",
      weightKg: "",
    },
  });

  const weight = Number(watch("weightKg"));
  const rate = Number(watch("ratePerKgGhs"));
  const value = weight > 0 && rate > 0 ? weight * rate : null;

  const onSubmit = async (values: RepaymentValues) => {
    try {
      await createRepayment({
        commodityId: values.commodityId,
        farmerId: values.farmerId,
        ratePerKgGhs: Number(values.ratePerKgGhs),
        seasonId: values.seasonId,
        weightKg: Number(values.weightKg),
        ...(values.intakeWarehouseId
          ? { intakeWarehouseId: values.intakeWarehouseId }
          : {}),
        ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
      }).unwrap();
      notify.success("Repayment recorded");
      router.push(LIST);
    } catch (err) {
      notify.error("Couldn't record the repayment", {
        description: extractApiError(err).message,
      });
    }
  };

  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All repayments" className="mb-2" />
      <AdminPageHeader title="Record produce repayment" />

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
            <AdminField label="Commodity" error={errors.commodityId?.message}>
              <select
                className={cn(adminSelectClass, "w-full", errors.commodityId && "border-error")}
                {...register("commodityId")}
              >
                <option value="">Choose the commodity</option>
                {(commodities.data?.data ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </AdminField>
            <AdminField label="Weight (kg)" error={errors.weightKg?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.weightKg && "border-error")}
                {...register("weightKg")}
              />
            </AdminField>
            <AdminField label="Rate per kg (GHS)" error={errors.ratePerKgGhs?.message}>
              <Input
                inputMode="decimal"
                className={cn(adminInputClass, errors.ratePerKgGhs && "border-error")}
                {...register("ratePerKgGhs")}
              />
            </AdminField>
          </div>

          <AdminField
            label="Take into stock at"
            optional
            hint="Choosing a warehouse mints a costed stock lot from this produce."
            error={errors.intakeWarehouseId?.message}
          >
            <select
              className={cn(adminSelectClass, "w-full")}
              {...register("intakeWarehouseId")}
            >
              <option value="">Do not take into stock</option>
              {(warehouses.data?.data ?? []).map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
        </AdminCard>

        <div className="flex items-center justify-between rounded-[6px] border border-soil/20 bg-surface-alt/50 px-4 py-3 text-[13px]">
          <span className="font-semibold text-soil">Value credited</span>
          <span className="text-[16px] font-bold text-leaf">
            {value === null ? "-" : formatCedis(value)}
          </span>
        </div>

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
            {saving ? "Saving…" : "Record repayment"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
