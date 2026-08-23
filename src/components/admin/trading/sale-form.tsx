"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AdminButton,
  AdminCard,
  AdminField,
  adminInputClass,
  CommitRow,
  DetailHeader,
  Mono,
} from "@/components/admin/ui";
import { SearchableSelect } from "@/components/admin/searchable-select";
import { HelpTip } from "@/components/admin/help-tip";
import { DASHBOARD_CRUMB, DetailNav } from "@/components/admin/detail-nav";
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

const emptyEntry = { commodityId: "", unitPriceGhs: "", weightKg: "" };

/** What the entry panel holds before "Add to goods" files it. */
type LineEntry = typeof emptyEntry;

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
      : { buyerId: "", lines: [], notes: "", paymentPolicyId: "" },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = watch("lines");

  // The ENTRY panel: a line is typed here and only joins the sale when "Add
  // to goods" files it - so the goods list only ever holds complete lines,
  // and the agreed total under it is always the real running figure.
  const [entry, setEntry] = useState<LineEntry>({ ...emptyEntry });
  const [entryError, setEntryError] = useState<null | string>(null);

  const entryWeight = Number(entry.weightKg) || 0;
  const entryPrice = Number(entry.unitPriceGhs) || 0;
  const entryTotal = entryWeight * entryPrice;
  const entryTouched =
    entry.commodityId !== "" || entry.weightKg !== "" || entry.unitPriceGhs !== "";

  const commitEntry = (): boolean => {
    if (!entry.commodityId) {
      setEntryError("Choose the commodity first.");
      return false;
    }
    if (!(entryWeight > 0)) {
      setEntryError("Enter the weight in kilograms.");
      return false;
    }
    if (!(entryPrice > 0)) {
      setEntryError("Enter the price per kilogram.");
      return false;
    }
    append({ ...entry });
    setEntry({ ...emptyEntry });
    setEntryError(null);
    return true;
  };

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
    // A typed-but-not-added line is a decision the user has not finished
    // making - refuse to guess whether it belongs on the sale.
    if (entryTouched) {
      setEntryError(
        'This line is not on the sale yet - press "Add to goods", or clear it.',
      );
      notify.error("Add the typed line first", {
        description:
          'The goods entry still holds a line. Press "Add to goods" or clear it before saving.',
      });
      return;
    }
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
      <DetailNav
        crumbs={[DASHBOARD_CRUMB, { label: "Sales", href: LIST }]}
        current={sale ? "Edit sale" : "New sale"}
      />
      <DetailHeader
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
        className="@container flex flex-col gap-5"
      >
        <AdminCard className="flex flex-col gap-5 px-5 py-4">
          <section className="flex flex-col gap-5">
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
          </section>

          <section className="flex flex-col gap-5">

            {/* The entry panel: one line in the making. */}
            <div
              className={cn(
                "rounded-none border bg-adm-sunken/60 p-3",
                entryError ? "border-console-red" : "border-adm-line",
              )}
            >
              <div className="grid grid-cols-1 gap-2 @min-[520px]:grid-cols-[1fr_100px_110px]">
                <AdminField label="Commodity">
                  <SearchableSelect
                    value={entry.commodityId}
                    onChange={(value) => {
                      setEntry((e) => ({ ...e, commodityId: value }));
                      setEntryError(null);
                    }}
                    options={commodityOptions.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                    placeholder="e.g. Maize"
                  />
                </AdminField>
                <AdminField label="Weight (kg)">
                  <Input
                    inputMode="decimal"
                    placeholder="e.g. 1200"
                    className={adminInputClass}
                    value={entry.weightKg}
                    onChange={(e) => {
                      setEntry((prev) => ({ ...prev, weightKg: e.target.value }));
                      setEntryError(null);
                    }}
                  />
                </AdminField>
                <AdminField label="Price/kg">
                  <Input
                    inputMode="decimal"
                    placeholder="e.g. 4.60"
                    className={adminInputClass}
                    value={entry.unitPriceGhs}
                    onChange={(e) => {
                      setEntry((prev) => ({ ...prev, unitPriceGhs: e.target.value }));
                      setEntryError(null);
                    }}
                  />
                </AdminField>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-adm-muted">
                  {entryTotal > 0 ? (
                    <>
                      This line:{" "}
                      <Mono className="font-semibold text-adm-ink">
                        {formatCedis(entryTotal)}
                      </Mono>
                    </>
                  ) : (
                    "Weight times price per kg."
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {entryTouched ? (
                    <AdminButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEntry({ ...emptyEntry });
                        setEntryError(null);
                      }}
                    >
                      Clear
                    </AdminButton>
                  ) : null}
                  <AdminButton type="button" onClick={commitEntry}>
                    + Add to goods
                  </AdminButton>
                </div>
              </div>
              {entryError ? (
                <p className="mt-1.5 text-[11px] font-medium text-console-red" role="alert">
                  {entryError}
                </p>
              ) : null}
            </div>

            {/* The filed lines: complete, totalled, removable. */}
            {fields.length === 0 ? (
              <p
                className={cn(
                  "rounded-none border border-dashed px-3 py-3 text-[11px]",
                  errors.lines
                    ? "border-console-red/60 text-console-red"
                    : "border-adm-strong/60 text-adm-muted",
                )}
              >
                {errors.lines
                  ? "Add at least one line - type it above and press \"Add to goods\"."
                  : "Nothing on the sale yet. Type the first line above and add it."}
              </p>
            ) : (
              <ul className="divide-y divide-adm-hairline">
                {fields.map((field, index) => {
                  const line = watchedLines?.[index];
                  const weight = Number(line?.weightKg) || 0;
                  const price = Number(line?.unitPriceGhs) || 0;
                  const name =
                    commodityOptions.find((c) => c.id === line?.commodityId)?.name ??
                    "Commodity";
                  return (
                    <li
                      key={field.id}
                      className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[11.5px] font-semibold text-adm-ink [overflow-wrap:anywhere]">
                          {name}
                        </p>
                        <p className="text-[11px] text-adm-muted">
                          <Mono>
                            {weight.toLocaleString("en-GH")} kg × {formatCedis(price)}
                            /kg
                          </Mono>
                        </p>
                      </div>
                      <div className="flex flex-none items-center gap-3">
                        <Mono className="text-[12px] font-semibold tabular-nums text-adm-ink">
                          {formatCedis(weight * price)}
                        </Mono>
                        <button
                          type="button"
                          onClick={() => {
                            remove(index);
                          }}
                          className="cursor-pointer text-[11px] font-semibold text-console-red underline-offset-2 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-baseline justify-between pt-2.5">
              <span className="flex items-center gap-1 text-[11px] text-adm-muted">
                <span className="min-w-0">
                  Agreed total
                  {fields.length > 0
                    ? ` · ${String(fields.length)} ${fields.length === 1 ? "line" : "lines"}`
                    : ""}
                </span>
                <HelpTip
                  label="What is the agreed total?"
                  text="Every added line summed: the full price this buyer is agreeing to pay. It updates as lines are added, before the sale is saved."
                />
              </span>
              <Mono className="text-[17px] font-bold text-adm-ink">
                {formatCedis(agreedTotal)}
              </Mono>
            </div>
          </section>

          <section className="flex flex-col gap-5">
            <AdminField label="Notes" optional>
              <Input
                className={adminInputClass}
                placeholder="e.g. Buyer collecting with their own truck"
                {...register("notes")}
              />
            </AdminField>
          </section>
        </AdminCard>

        <CommitRow>
          <AdminButton
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push(LIST)}
          >
            Cancel
          </AdminButton>
          <AdminButton type="submit" disabled={saving} loading={saving} size="lg">
            {saving ? "Saving…" : sale ? "Save changes" : "Draft sale"}
          </AdminButton>
        </CommitRow>
      </form>
    </div>
  );
}
