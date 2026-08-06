"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  Mono,
  SectionHeading,
  adminInputClass,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { HelpTip } from "@/components/admin/help-tip";
import { BackButton } from "@/components/ui/BackButton";
import { Input } from "@/components/ui/input";
import { useGetBuyersQuery } from "@/redux/buyers/buyers-api";
import { useGetCommoditiesQuery } from "@/redux/commodities/commodities-api";
import { useGetPaymentPoliciesQuery } from "@/redux/payment-policies/payment-policies-api";
import { useRemoteSearch } from "@/hooks/use-remote-search";
import {
  useCreateSaleMutation,
  useUpdateSaleMutation,
} from "@/redux/sales/admin-sales-api";
import { extractApiError } from "@/lib/extract-api-error";
import { formatCedis } from "@/lib/format-money";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import type { ISaleDetail } from "@/types/admin-sale.types";
import { saleSchema, type SaleValues } from "@/validations/sale-schema";

const LIST = "/admin/sales";

const emptyLine = { commodityId: "", unitPriceGhs: "", weightKg: "" };

/** Draft (create) or edit a sale. In edit mode only DRAFT sales are editable. */
export function SaleForm({ sale }: { sale?: ISaleDetail }) {
  const router = useRouter();
  const [createSale, createState] = useCreateSaleMutation();
  const [updateSale, updateState] = useUpdateSaleMutation();
  const saving = createState.isLoading || updateState.isLoading;

  const buyerSearch = useRemoteSearch();
  const buyers = useGetBuyersQuery({
    isActive: true,
    limit: 20,
    search: buyerSearch.query,
  });
  const commodities = useGetCommoditiesQuery({ limit: 100, isActive: true });
  const policies = useGetPaymentPoliciesQuery({ limit: 100, isActive: true });

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SaleValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: sale
      ? {
          buyerId: sale.buyer.id,
          notes: sale.notes ?? "",
          paymentPolicyId: sale.paymentPolicy?.id ?? "",
          lines: sale.lines.map((l) => ({
            commodityId: l.commodity.id,
            unitPriceGhs: String(l.unitPriceGhs ?? ""),
            weightKg: String(l.weightKg),
          })),
        }
      : { buyerId: "", lines: [{ ...emptyLine }], notes: "", paymentPolicyId: "" },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = watch("lines");

  const agreedTotal = useMemo(
    () =>
      (watchedLines ?? []).reduce((acc, l) => {
        const w = Number(l?.weightKg) || 0;
        const p = Number(l?.unitPriceGhs) || 0;
        return acc + w * p;
      }, 0),
    [watchedLines],
  );

  const onSubmit = async (values: SaleValues) => {
    const body = {
      buyerId: values.buyerId,
      lines: values.lines.map((l) => ({
        commodityId: l.commodityId,
        unitPriceGhs: Number(l.unitPriceGhs),
        weightKg: Number(l.weightKg),
      })),
      ...(values.paymentPolicyId
        ? { paymentPolicyId: values.paymentPolicyId }
        : {}),
      ...(values.notes?.trim() ? { notes: values.notes.trim() } : {}),
    };
    try {
      if (sale) {
        await updateSale({ id: sale.id, body }).unwrap();
        notify.success("Sale updated");
        router.push(`${LIST}/${sale.id}`);
      } else {
        const res = await createSale(body).unwrap();
        notify.success("Sale drafted");
        router.push(`${LIST}/${res.data.sale.id}`);
      }
    } catch (err) {
      notify.error("Couldn't save the sale", {
        description: extractApiError(err).message,
      });
    }
  };

  const commodityOptions = commodities.data?.data ?? [];

  return (
    <div className="max-w-[720px]">
      <BackButton href={LIST} label="All sales" className="mb-2" />
      <AdminPageHeader
        title={sale ? "Edit sale" : "New sale"}
        sub={
          sale
            ? "Change the goods and terms while this sale is still a draft"
            : "Agree goods, weights and a price with a buyer - it stays a draft until you confirm it"
        }
      />

      {/* The goods lines measure against this form, not the viewport: the
          console shell keeps a ~225px rail beside it, so `sm:` put four
          controls in one row while the column was still too narrow. */}
      <form
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-4"
      >
        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <SectionHeading
            className="mb-0"
            hint="Who is buying, and the terms they pay on."
          >
            Who and on what terms
          </SectionHeading>
          <AdminField label="Buyer" error={errors.buyerId?.message}>
            <Controller
              control={control}
              name="buyerId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value}
                  onChange={field.onChange}
                  options={(buyers.data?.data ?? []).map((b) => ({
                    value: b.id,
                    label: b.name,
                  }))}
                  placeholder="e.g. Accra Grain Traders"
                  onSearchChange={buyerSearch.onSearchChange}
                  loading={buyers.isFetching}
                  className={cn(errors.buyerId && "border-console-red")}
                />
              )}
            />
          </AdminField>

          <AdminField
            label="Payment terms"
            optional
            hint="When this buyer has to pay: the deposit up front, and what must be in before a truck may be loaded."
          >
            <Controller
              control={control}
              name="paymentPolicyId"
              render={({ field }) => (
                <SearchableSelect
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  options={[
                    {
                      value: "",
                      label: "Default (or the buyer's policy) at confirmation",
                    },
                    ...(policies.data?.data ?? []).map((p) => ({
                      value: p.id,
                      label: `${p.name}${p.isDefault ? " (default)" : ""}`,
                    })),
                  ]}
                  placeholder="Default (or the buyer's policy) at confirmation"
                />
              )}
            />
          </AdminField>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <SectionHeading
            className="mb-0"
            hint="One line per commodity. Weight times price per kg gives the agreed total below."
            actions={
              <AdminButton
                type="button"
                variant="outline"
                className="h-8 px-3 text-[12.5px]"
                onClick={() => append({ ...emptyLine })}
              >
                + Add line
              </AdminButton>
            }
          >
            Goods
          </SectionHeading>

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-1 gap-2 border-b border-adm-hairline pb-3 last:border-b-0 @min-[520px]:grid-cols-[1fr_100px_110px_auto]"
            >
              <AdminField
                label="Commodity"
                error={errors.lines?.[index]?.commodityId?.message}
              >
                <Controller
                  control={control}
                  name={`lines.${index}.commodityId`}
                  render={({ field }) => (
                    <SearchableSelect
                      value={field.value}
                      onChange={field.onChange}
                      options={commodityOptions.map((c) => ({
                        value: c.id,
                        label: c.name,
                      }))}
                      placeholder="e.g. Maize"
                      className={cn(
                        errors.lines?.[index]?.commodityId && "border-console-red",
                      )}
                    />
                  )}
                />
              </AdminField>
              <AdminField
                label="Weight (kg)"
                error={errors.lines?.[index]?.weightKg?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 1200"
                  className={adminInputClass}
                  {...register(`lines.${index}.weightKg`)}
                />
              </AdminField>
              <AdminField
                label="Price/kg"
                error={errors.lines?.[index]?.unitPriceGhs?.message}
              >
                <Input
                  inputMode="decimal"
                  placeholder="e.g. 4.60"
                  className={adminInputClass}
                  {...register(`lines.${index}.unitPriceGhs`)}
                />
              </AdminField>
              <div className="flex items-end">
                {fields.length > 1 ? (
                  <AdminButton
                    type="button"
                    variant="ghost"
                    className="h-9 px-2 text-console-red"
                    onClick={() => remove(index)}
                  >
                    Remove
                  </AdminButton>
                ) : null}
              </div>
            </div>
          ))}

          <div className="flex items-baseline justify-between pt-1">
            <span className="flex items-center gap-1 text-[12px] text-adm-muted">
              <span className="min-w-0">Agreed total</span>
              <HelpTip
                label="What is the agreed total?"
                text="Every line added up: the full price this buyer is agreeing to pay."
              />
            </span>
            <Mono className="text-[16px] font-bold text-adm-ink">
              {formatCedis(agreedTotal)}
            </Mono>
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col gap-3 px-5 py-4">
          <SectionHeading className="mb-0">Anything else</SectionHeading>
          <AdminField label="Notes" optional>
            <Input
              className={adminInputClass}
              placeholder="e.g. Buyer collecting with their own truck"
              {...register("notes")}
            />
          </AdminField>
        </AdminCard>

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
            {saving ? "Saving…" : sale ? "Save changes" : "Draft sale"}
          </AdminButton>
        </div>
      </form>
    </div>
  );
}
