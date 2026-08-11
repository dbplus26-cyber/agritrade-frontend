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
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { repaymentSchema, type RepaymentValues } from "@/validations/farm-schema";

const LIST = "/admin/repayments";
const RECEIPT_MISSING = "Upload the signed receipt or weigh slip";

/** Record a produce repayment. `farmerId` may be pre-filled from a farmer. */
export function RepaymentForm({ farmerId }: { farmerId?: string }) {
  const router = useRouter();
  const [createRepayment, { isLoading: saving }] = useCreateRepaymentMutation();
  const farmerSearch = useRemoteSearch();
  const farmers = useGetFarmersQuery({
    isActive: true,
    limit: 20,
    search: farmerSearch.query,
  });
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
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All repayments" className="mb-2" />
      <AdminPageHeader
        title="Record produce repayment"
        hint="Take produce back from a farmer against what they were advanced."
        sub="Produce a farmer brought back against their grant - optionally received into a warehouse"
      />

      {/* Field pairs measure against this form, not the viewport: the console
          shell keeps a ~225px rail beside it, so `sm:` paired fields up while
          the column was still too narrow to carry two of them. */}
      <form
        noValidate
        // Surface the missing file alongside RHF's own errors: on an invalid
        // submit RHF never calls onSubmit, so the file check runs here too.
        onSubmit={handleSubmit(onSubmit, () => {
          if (!receipt) setReceiptError(RECEIPT_MISSING);
        })}
        className="@container flex flex-col gap-5"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-5">
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
                    placeholder="e.g. Abukari Yakubu"
                    onSearchChange={farmerSearch.onSearchChange}
                    loading={farmers.isFetching}
                    className={cn(errors.farmerId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
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
                      placeholder="e.g. 2026 major season"
                      className={cn(errors.seasonId && "border-console-red")}
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
                      placeholder="e.g. Maize"
                      className={cn(errors.commodityId && "border-console-red")}
                    />
                  )}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
              <AdminField label="Weight (kg)" error={errors.weightKg?.message}>
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 900"
                  className={cn(adminInputClass, errors.weightKg && "border-console-red")}
                  {...register("weightKg")}
                />
              </AdminField>
              <AdminField
                error={errors.ratePerKgGhs?.message}
                hint="The price you are crediting this produce at, which sets how much it clears off the grant."
                label="Rate per kg (GHS)"
              >
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 4.20"
                  className={cn(adminInputClass, errors.ratePerKgGhs && "border-console-red")}
                  {...register("ratePerKgGhs")}
                />
              </AdminField>
            </div>
            {/* The running total sits with the two figures it is worked out
                from, not at the foot of the form where it read as a stray. */}
            <div className="flex items-center justify-between rounded-none border border-adm-hairline bg-adm-sunken px-4 py-3 text-[13px]">
              <span className="font-semibold text-adm-muted">Value credited</span>
              <span className="text-[16px] font-bold text-console">
                {value === null ? "-" : formatCedis(value)}
              </span>
            </div>
          </section>

          <section className="flex flex-col gap-5">
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
                    placeholder="e.g. Tamale main store"
                  />
                )}
              />
            </AdminField>
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <Input
                placeholder="e.g. Two bags rejected for damp"
                className={adminInputClass}
                {...register("notes")}
              />
            </AdminField>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 @min-[440px]:grid-cols-2">
              <AdminField
                label="Received by"
                optional
                hint="Who physically took delivery of the produce."
                error={errors.receivedByName?.message}
              >
                <Input
                  placeholder="e.g. Musah Alhassan"
                  className={cn(adminInputClass, errors.receivedByName && "border-console-red")}
                  {...register("receivedByName")}
                />
              </AdminField>
              <AdminField label="Document name" optional>
                <Input
                  placeholder="e.g. Weigh slip, 12 Nov"
                  className={adminInputClass}
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                />
              </AdminField>
            </div>
            {/* Not an AdminField: wrapping the picker's buttons in a <label>
                would misroute label clicks. Same label/error markup as
                AdminField so it reads as one of the fields above it. */}
            <div>
              <span className="mb-1 block text-[13px] font-semibold text-adm-ink">
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
                  className="mt-1.5 block text-[12.5px] font-medium text-console-red"
                >
                  {receiptError}
                </span>
              ) : null}
            </div>
          </section>
        </AdminCard>

        <div className="flex flex-wrap justify-end gap-2">
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} size="lg">
            {saving ? "Saving…" : "Record repayment"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
