"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  adminSelectClass,
  CommitRow,
  DetailHeader,
  Mono,
} from "@/components/admin/ui";
import { HelpTip } from "@/components/admin/help-tip";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
import { Input } from "@/components/ui/input";
import { DateInput } from "@/components/ui/date-input";
import { SimpleSelect } from "@/components/ui/simple-select";
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
  const supplierSearch = useRemoteSearch();
  const agents = useGetAgentsQuery({ limit: 100, isActive: true });
  // Only agents with an opened float can pay for a purchase.
  const agentOptions = (agents.data?.data ?? []).filter((a) => a.profileId);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
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
  // Suppliers is an open register - a firm keeps adding them and never
  // removes the old ones - so the picker asks the server rather than
  // filtering a fetched page (see useRemoteSearch), and it asks only for
  // suppliers of the KIND the source already names: picking "Company" and
  // then scrolling past every farm-gate farmer answered a question the form
  // had already been told.
  const suppliers = useGetSuppliersQuery({
    isActive: true,
    limit: 20,
    search: supplierSearch.query,
    sourceType: source,
  });
  // A supplier picked under one source is not valid under another - the list
  // itself changes kind - so switching the source clears the pick rather
  // than silently carrying a farmer onto a company purchase.
  useEffect(() => {
    setValue("supplierId", "");
  }, [source, setValue]);

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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Purchases", href: LIST }]}
        current="Record purchase"
      />
      <DetailHeader
        title="Record purchase"
        hint="Buy a load from a supplier or agent and take it into stock."
        sub="Goods bought and paid for - an agent-paid purchase debits their float immediately"
      />
      <AdminCard className="px-5 py-[18px]">
        {/* The form is the container the field pairs measure themselves
            against, not the viewport: the console shell keeps ~225px of rail
            beside it, so a `sm:` pair fires while this column is still barely
            300px wide and two selects sit shoulder to shoulder in it. */}
        <form
          noValidate
          onSubmit={handleSubmit(onSubmit)}
          className="@container flex flex-col gap-5"
        >
          <section className="flex flex-col gap-5">
            <div className="grid gap-5 @min-[440px]:grid-cols-2">
              <AdminField
                label="Source"
                hint="Who you bought from: an individual farmer, a company, or one of your own field agents."
                error={errors.source?.message}
              >
                <Controller
                  control={control}
                  name="source"
                  render={({ field }) => (
                    <SimpleSelect
                      className={cn(
                        adminSelectClass,
                        "w-full",
                        errors.source && "border-console-red",
                      )}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="Choose the source"
                      options={SOURCE_OPTIONS.map((s) => ({
                        value: s,
                        label: SOURCE_LABEL[s],
                      }))}
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
                      placeholder="e.g. Musah Alhassan"
                      emptyText="No agents with an opened float match."
                      className={cn(errors.agentProfileId && "border-console-red")}
                    />
                  )}
                />
              </AdminField>
            ) : null}
            {/* The seller is recordable whatever the source - an agent buys
                FROM someone too, and a purchase with no counterparty has no
                paper trail when a load turns out short. The list carries only
                suppliers of the kind the source names. */}
            <AdminField
              label="Supplier"
              optional
              hint={`Who the goods were bought from - only ${SOURCE_LABEL[source].toLowerCase()} suppliers are listed.`}
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
                      placeholder="e.g. Bontanga Farms Ltd"
                      onSearchChange={supplierSearch.onSearchChange}
                      loading={suppliers.isFetching}
                    />
                  )}
                />
              </AdminField>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid gap-5 @min-[440px]:grid-cols-2">
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

            <div className="flex items-baseline justify-between px-0.5 py-1.5">
              <span className="flex items-center gap-1 text-[11px] font-bold tracking-[0.09em] text-adm-muted uppercase">
                <span className="min-w-0">Total</span>
                <HelpTip
                  label="What is the Total?"
                  text="The weight times the price per kg: what this whole purchase will cost you."
                />
              </span>
              <Mono className="text-[15px] font-semibold text-adm-ink">
                {formatCedis(totalPreview)}
              </Mono>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <div className="grid gap-5 @min-[440px]:grid-cols-2">
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
                      placeholder="e.g. Tamale main store"
                    />
                  )}
                />
              </AdminField>
              <AdminField
                label="Purchase date"
                error={errors.purchasedAt?.message}
              >
                <DateInput
                  className={cn(
                    adminInputClass,
                    errors.purchasedAt && "border-console-red",
                  )}
                  placeholder="Pick the purchase date"
                  {...register("purchasedAt")}
                />
              </AdminField>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <AdminField label="Notes" optional error={errors.notes?.message}>
              <textarea
                rows={4}
                placeholder="e.g. Second load from the same lorry"
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
              <div className="flex flex-wrap items-center gap-3">
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
                    onClick={() => fileInput.current?.click()}
                  >
                    {previewUrl ? "Replace photo" : "Choose photo"}
                  </AdminButton>
                  {photoFile ? (
                    <AdminButton
                      type="button"
                      variant="outline"
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
          </section>

          <CommitRow className="mt-1">
            <AdminButton
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push(LIST)}
            >
              Cancel
            </AdminButton>
            <AdminButton
              type="submit"
              disabled={saving}
              loading={saving}
              size="lg"
            >
              {saving ? "Recording…" : "Record purchase"}
            </AdminButton>
          </CommitRow>
        </form>
      </AdminCard>
    </div>
  );
}
