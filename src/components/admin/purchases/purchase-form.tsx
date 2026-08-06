"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
  adminSelectClass,
  Mono,
} from "@/components/admin/ui";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { useGetAgentsQuery } from "@/redux/agents/agents-api";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useCreatePurchaseMutation } from "@/redux/purchases/purchases-api";
import { useGetSuppliersQuery } from "@/redux/suppliers/suppliers-api";
import { useGetWarehousesQuery } from "@/redux/warehouses/warehouses-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { optimizeImage } from "@/lib/optimize-image";
import { cn } from "@/lib/utils";
import { PurchaseSource } from "@/types/registry.types";
import {
  purchaseSchema,
  type PurchaseValues,
} from "@/validations/purchase-schema";
import { SOURCE_LABEL } from "@/components/admin/registry/registry-bits";
import { todayInputValue } from "./purchase-bits";

const LIST = "/admin/purchases";

const SOURCE_OPTIONS = [
  PurchaseSource.INDIVIDUAL,
  PurchaseSource.COMPANY,
  PurchaseSource.AGENT,
] as const;

/** Records a purchase: the money side becomes real the moment this saves. */
export function PurchaseCreate() {
  const router = useRouter();
  const [createPurchase, { isLoading: saving }] = useCreatePurchaseMutation();

  // Weigh-slip travels WITH the save (multipart payload + file).
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const previewUrl = useMemo(
    () => (photoFile ? URL.createObjectURL(photoFile) : null),
    [photoFile],
  );

  const commodities = useGetCommoditiesQuery({ limit: 100, isActive: true });
  const warehouses = useGetWarehousesQuery({ limit: 100, isActive: true });
  // Suppliers is an open register - a firm keeps adding them and never
  // removes the old ones - so the picker asks the server rather than
  // filtering a fetched page. See useRemoteSearch.
  const supplierSearch = useRemoteSearch();
  const suppliers = useGetSuppliersQuery({
    isActive: true,
    limit: 20,
    search: supplierSearch.query,
  });
  const agents = useGetAgentsQuery({ limit: 100, isActive: true });
  // Only agents with an opened float can pay for a purchase.
  const agentOptions = (agents.data?.data ?? []).filter((a) => a.profileId);

  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<PurchaseValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      source: PurchaseSource.INDIVIDUAL,
      commodityId: "",
      supplierId: "",
      agentProfileId: "",
      warehouseId: "",
      weightKg: "",
      unitPriceGhs: "",
      purchasedAt: todayInputValue(),
      notes: "",
    },
  });

  const source = watch("source");
  const weightKg = Number(watch("weightKg")) || 0;
  const unitPriceGhs = Number(watch("unitPriceGhs")) || 0;
  // Display only - the server recomputes the authoritative total.
  const totalPreview = weightKg * unitPriceGhs;

  const onSubmit = async (values: PurchaseValues) => {
    try {
      const res = await createPurchase({
        body: {
          source: values.source,
          commodityId: values.commodityId,
          ...(values.supplierId ? { supplierId: values.supplierId } : {}),
          ...(values.source === PurchaseSource.AGENT && values.agentProfileId
            ? { agentProfileId: values.agentProfileId }
            : {}),
          ...(values.warehouseId ? { warehouseId: values.warehouseId } : {}),
          weightKg: Number(values.weightKg),
          unitPriceGhs: Number(values.unitPriceGhs),
          purchasedAt: values.purchasedAt,
          ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
        },
        photo: photoFile ?? undefined,
      }).unwrap();
      notify.success("Purchase recorded");
      router.replace(`${LIST}/${res.data.purchase.id}`);
    } catch (err) {
      const { message, fieldErrors, hasFieldErrors } = extractApiError(err);
      if (hasFieldErrors && fieldErrors) {
        for (const field of [
          "commodityId",
          "weightKg",
          "unitPriceGhs",
          "purchasedAt",
          "notes",
        ] as const) {
          if (fieldErrors[field])
            setError(field, { message: fieldErrors[field] });
        }
      }
      notify.error("Couldn't record the purchase", { description: message });
    }
  };

  return (
    <div className="max-w-[640px]">
      <BackButton href={LIST} label="All purchases" className="mb-2" />
      <AdminPageHeader
        title="Record purchase"
        hint="Buy a load from a supplier or agent and take it into stock."
        sub="Goods bought and paid for - an agent-paid purchase debits their float immediately"
      />
      <AdminCard className="px-5 py-[18px]">
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-[13px]"
        >
          <div className="grid gap-[13px] sm:grid-cols-2">
            <AdminField label="Source" error={errors.source?.message}>
              <Controller
                control={control}
                name="source"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={cn(adminSelectClass, "w-full")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {SOURCE_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    placeholder="Choose a commodity"
                    className={cn(errors.commodityId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
          </div>

          {source === PurchaseSource.AGENT ? (
            <AdminField
              label="Paying agent"
              hint="The float this purchase was paid from. An agent appears here once their float has been opened with a top-up."
              error={errors.agentProfileId?.message}
            >
              <Controller
                control={control}
                name="agentProfileId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={agentOptions.map((a) => ({
                      value: a.profileId ?? "",
                      label: `${a.firstName} ${a.lastName}`,
                    }))}
                    placeholder="Choose the agent"
                    emptyText="No agents with an opened float match."
                    className={cn(errors.agentProfileId && "border-console-red")}
                  />
                )}
              />
            </AdminField>
          ) : (
            <AdminField
              label="Supplier"
              optional
              hint="Who the goods were bought from."
            >
              <Controller
                control={control}
                name="supplierId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={[
                      { value: "", label: "No supplier recorded" },
                      ...(suppliers.data?.data ?? []).map((s) => ({
                        value: s.id,
                        label: s.name,
                        ...(s.community ? { hint: s.community } : {}),
                      })),
                    ]}
                    placeholder="Choose a supplier (optional)"
                    onSearchChange={supplierSearch.onSearchChange}
                    loading={suppliers.isFetching}
                  />
                )}
              />
            </AdminField>
          )}

          <div className="grid gap-[13px] sm:grid-cols-2">
            <AdminField label="Weight (kg)" error={errors.weightKg?.message}>
              <Input
                inputMode="decimal"
                placeholder="e.g. 1200"
                className={cn(adminInputClass, errors.weightKg && "border-console-red")}
                {...register("weightKg")}
              />
            </AdminField>
            <AdminField
              label="Price per kg (GH₵)"
              error={errors.unitPriceGhs?.message}
            >
              <Input
                inputMode="decimal"
                placeholder="e.g. 4.20"
                className={cn(
                  adminInputClass,
                  errors.unitPriceGhs && "border-console-red",
                )}
                {...register("unitPriceGhs")}
              />
            </AdminField>
          </div>

          <div className="ledger-rule flex items-baseline justify-between px-0.5 py-1.5">
            <span className="text-[11px] font-bold tracking-[0.09em] text-adm-muted uppercase">
              Total
            </span>
            <Mono className="text-[15px] font-semibold text-adm-ink">
              {formatCedis(totalPreview)}
            </Mono>
          </div>

          <div className="grid gap-[13px] sm:grid-cols-2">
            <AdminField
              label="Destination warehouse"
              optional
              hint="Can also be set at receipt."
            >
              <Controller
                control={control}
                name="warehouseId"
                render={({ field }) => (
                  <SearchableSelect
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    options={[
                      { value: "", label: "Choose later" },
                      ...(warehouses.data?.data ?? []).map((w) => ({
                        value: w.id,
                        label: w.name,
                      })),
                    ]}
                    placeholder="Choose later"
                  />
                )}
              />
            </AdminField>
            <AdminField
              label="Purchase date"
              error={errors.purchasedAt?.message}
            >
              <Input
                type="date"
                className={cn(
                  adminInputClass,
                  errors.purchasedAt && "border-console-red",
                )}
                {...register("purchasedAt")}
              />
            </AdminField>
          </div>

          <AdminField label="Notes" optional error={errors.notes?.message}>
            <textarea
              rows={4}
              placeholder="Anything worth remembering about this purchase."
              className={cn(
                adminInputClass,
                "h-auto min-h-[60px] w-full resize-y py-2",
                errors.notes && "border-console-red",
              )}
              {...register("notes")}
            />
          </AdminField>

          <AdminField
            label="Weigh-slip photo"
            optional
            hint="The scale ticket from the village - proof of the recorded weight."
          >
            <div className="flex items-center gap-3">
              {previewUrl ? (
                <Image
                  src={previewUrl}
                  alt="Weigh-slip preview"
                  width={56}
                  height={56}
                  unoptimized
                  className="h-14 w-14 rounded border border-adm-line object-cover"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded border border-dashed border-adm-line text-[10px] text-adm-faint">
                  No photo
                </div>
              )}
              <div className="flex gap-2">
                <AdminButton
                  type="button"
                  variant="secondary"
                  className="h-8 px-3 text-[12.5px]"
                  onClick={() => fileInput.current?.click()}
                >
                  {previewUrl ? "Replace photo" : "Choose photo"}
                </AdminButton>
                {photoFile ? (
                  <AdminButton
                    type="button"
                    variant="outline"
                    className="h-8 px-3 text-[12.5px]"
                    onClick={() => setPhotoFile(null)}
                  >
                    Remove
                  </AdminButton>
                ) : null}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (!file) {
                    setPhotoFile(null);
                    return;
                  }
                  void optimizeImage(file).then(setPhotoFile);
                }}
              />
            </div>
          </AdminField>

          <div className="mt-1 flex gap-2">
            <AdminButton
              type="submit"
              disabled={saving}
              className="h-[38px] px-[18px]"
            >
              {saving ? "Recording…" : "Record purchase"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="outline"
              className="h-[38px] px-3.5"
              onClick={() => router.push(LIST)}
            >
              Cancel
            </AdminButton>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}
