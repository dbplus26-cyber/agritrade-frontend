"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { BackButton } from "@/components/ui/BackButton";
import { FilePicker } from "@/components/ui/FilePicker";
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
const RECEIPT_MISSING = "Upload the signed receipt or weigh slip";

/** Record a produce repayment. `farmerId` may be pre-filled from a farmer. */
export function RepaymentForm({ farmerId }: { farmerId?: string }) {
  const router = useRouter();
  const [createRepayment, { isLoading: saving }] = useCreateRepaymentMutation();
  const farmers = useGetFarmersQuery({ isActive: true, limit: 100 });
  const seasons = useGetSeasonsQuery({ isActive: true, limit: 100 });
  const commodities = useGetCommoditiesQuery({ isActive: true, limit: 100 });
  const warehouses = useGetWarehousesQuery({ isActive: true, limit: 100 });

  // The signed receipt rides outside the Zod schema: it is a multipart file
  // part, staged here until the form's own submit carries it.
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [documentName, setDocumentName] = useState("");

  const {
    register,
    control,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RepaymentValues>({
    resolver: zodResolver(repaymentSchema),
    defaultValues: {
      commodityId: "",
      farmerId: farmerId ?? "",
      intakeWarehouseId: "",
      notes: "",
      ratePerKgGhs: "",
      receivedByName: "",
      seasonId: "",
      weightKg: "",
    },
  });

  const weight = Number(watch("weightKg"));
  const rate = Number(watch("ratePerKgGhs"));
  const value = weight > 0 && rate > 0 ? weight * rate : null;

  const onSubmit = async (values: RepaymentValues) => {
    if (!receipt) {
      setReceiptError(RECEIPT_MISSING);
      return;
    }
    try {
      await createRepayment({
        body: {
          commodityId: values.commodityId,
          farmerId: values.farmerId,
          ratePerKgGhs: Number(values.ratePerKgGhs),
          seasonId: values.seasonId,
          weightKg: Number(values.weightKg),
          ...(values.intakeWarehouseId
            ? { intakeWarehouseId: values.intakeWarehouseId }
            : {}),
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
          ...(values.receivedByName?.trim()
            ? { receivedByName: values.receivedByName.trim() }
            : {}),
          ...(documentName.trim() ? { documentName: documentName.trim() } : {}),
        },
        receipt,
      }).unwrap();
      notify.success("Repayment recorded");
      router.push(LIST);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "farmerId",
          "seasonId",
          "commodityId",
          "weightKg",
          "ratePerKgGhs",
          "intakeWarehouseId",
          "notes",
          "receivedByName",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't record the repayment", { description: message });
    }
  };

  return (
    <div className="max-w-[560px]">
      <BackButton href={LIST} label="All repayments" className="mb-2" />
      <AdminPageHeader
        title="Record produce repayment"
        sub="Produce a farmer brought back against their grant - optionally received into a warehouse"
      />

      <form
        noValidate
        // Surface the missing file alongside RHF's own errors: on an invalid
        // submit RHF never calls onSubmit, so the file check runs here too.
        onSubmit={handleSubmit(onSubmit, () => {
          if (!receipt) setReceiptError(RECEIPT_MISSING);
        })}
        className="flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <AdminField label="Farmer" error={errors.farmerId?.message}>
            <Controller
              control={control}
              name="farmerId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={(farmers.data?.data ?? []).map((f) => ({
                    value: f.id,
                    label: f.name,
                    ...(f.community ? { hint: f.community } : {}),
                  }))}
                  placeholder="Choose the farmer"
                  className={cn(errors.farmerId && "border-error")}
                />
              )}
            />
          </AdminField>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField label="Season" error={errors.seasonId?.message}>
              <Controller
                control={control}
                name="seasonId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={(seasons.data?.data ?? []).map((s) => ({
                      value: s.id,
                      label: s.name,
                    }))}
                    placeholder="Choose the season"
                    className={cn(errors.seasonId && "border-error")}
                  />
                )}
              />
            </AdminField>
            <AdminField label="Commodity" error={errors.commodityId?.message}>
              <Controller
                control={control}
                name="commodityId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={(commodities.data?.data ?? []).map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    placeholder="Choose the commodity"
                    className={cn(errors.commodityId && "border-error")}
                  />
                )}
              />
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
            <Controller
              control={control}
              name="intakeWarehouseId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={[
                    { value: "", label: "Do not take into stock" },
                    ...(warehouses.data?.data ?? []).map((w) => ({
                      value: w.id,
                      label: w.name,
                    })),
                  ]}
                  placeholder="Do not take into stock"
                />
              )}
            />
          </AdminField>

          <AdminField label="Notes" optional error={errors.notes?.message}>
            <Input className={adminInputClass} {...register("notes")} />
          </AdminField>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <div>
            <div className="text-[10.5px] font-bold tracking-[0.09em] text-soil uppercase">
              Signed receipt
            </div>
            <p className="mt-1 text-[12px] text-soil">
              The signed receipt or weigh slip is what settles &quot;I already
              paid&quot; disputes - it stays on this record as the evidence.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <AdminField
              label="Received by"
              optional
              hint="Who physically took delivery of the produce."
              error={errors.receivedByName?.message}
            >
              <Input
                className={cn(adminInputClass, errors.receivedByName && "border-error")}
                {...register("receivedByName")}
              />
            </AdminField>
            <AdminField label="Document name" optional>
              <Input
                placeholder="Repayment receipt"
                className={adminInputClass}
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
              />
            </AdminField>
          </div>
          {/* Not an AdminField: wrapping the picker's buttons in a <label>
              would misroute label clicks. Same stencil-label + error markup. */}
          <div>
            <span className="stencil mb-[7px] block text-[11px] uppercase tracking-[0.14em] text-harvest-deep">
              Receipt file
            </span>
            <FilePicker
              accept="image/*,application/pdf,.doc,.docx"
              hint="PDF or a photo of the signed receipt / weigh slip"
              onConfirm={(file) => {
                setReceipt(file);
                if (file) setReceiptError(null);
              }}
              optimize={false}
              stage
              triggerLabel="Choose receipt"
            />
            {receiptError ? (
              <span
                role="alert"
                className="mt-1 block text-[12px] font-medium text-error"
              >
                {receiptError}
              </span>
            ) : null}
          </div>
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
