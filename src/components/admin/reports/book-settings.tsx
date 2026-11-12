"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  WidgetEmpty,
  WidgetError,
} from "@/components/admin/dashboard/chart-kit";
import {
  AdminButton,
  AdminCard,
  AdminField,
  AdminPageHeader,
  adminInputClass,
} from "@/components/admin/ui";
import { Input } from "@/components/ui/input";
import { ListPagination } from "@/components/ui/ListPagination";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthRole } from "@/hooks/use-auth-role";
import { usePermissions } from "@/hooks/use-permissions";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useGetCommoditiesQuery,
  useUpdateCommodityMutation,
} from "@/redux/commodities/commodities-api";
import type { ICommodity } from "@/types/registry.types";
import {
  bookSettingsSchema,
  type BookSettingsValues,
} from "@/validations/registry-schema";

const FIELDS = [
  {
    name: "bagWeightKg",
    label: "Kg per bag",
    hint: "What one bag of this commodity weighs. The books work out every bag count from it: kg divided by this.",
    placeholder: "e.g. 100",
  },
  {
    name: "fmStandardPct",
    label: "Buying: standard FM %",
    hint: "When a purchase tests above the buying tolerance, the excess over this is taken off the weight the supplier is paid on. Empty: no deduction.",
    placeholder: "e.g. 3",
  },
  {
    name: "fmTolerancePct",
    label: "Buying: tolerance %",
    hint: "The deduction only applies above this. A 3.17% test against a 3.5% tolerance is paid in full.",
    placeholder: "e.g. 3.5",
  },
  {
    name: "saleFmStandardPct",
    label: "Selling: standard FM %",
    hint: "What your buyers hold a delivery to. When their test at arrival is above the selling tolerance, the excess over this comes off the weight they pay on.",
    placeholder: "e.g. 3",
  },
  {
    name: "saleFmTolerancePct",
    label: "Selling: tolerance %",
    hint: "The buyer's deduction only applies above this.",
    placeholder: "e.g. 3.5",
  },
] as const;

const text = (v: number | null) => (v === null ? "" : String(v));
const toValues = (c: ICommodity): BookSettingsValues => ({
  bagWeightKg: text(c.bagWeightKg),
  fmStandardPct: text(c.fmStandardPct),
  fmTolerancePct: text(c.fmTolerancePct),
  saleFmStandardPct: text(c.saleFmStandardPct),
  saleFmTolerancePct: text(c.saleFmTolerancePct),
});

/** One commodity's settings: its own small form, saved on its own. */
function CommodityRow({
  canManage,
  commodity,
}: {
  canManage: boolean;
  commodity: ICommodity;
}) {
  const [update, { isLoading }] = useUpdateCommodityMutation();
  const {
    formState: { errors, isDirty },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<BookSettingsValues>({
    resolver: zodResolver(bookSettingsSchema),
    defaultValues: toValues(commodity),
  });

  const onSubmit = async (values: BookSettingsValues) => {
    // Empty is a real answer: no bag size, or no deduction on that side.
    const num = (v: string | undefined) => (v?.trim() ? Number(v) : null);
    try {
      const res = await update({
        id: commodity.id,
        body: {
          bagWeightKg: num(values.bagWeightKg),
          fmStandardPct: num(values.fmStandardPct),
          fmTolerancePct: num(values.fmTolerancePct),
          saleFmStandardPct: num(values.saleFmStandardPct),
          saleFmTolerancePct: num(values.saleFmTolerancePct),
        },
      }).unwrap();
      reset(toValues(res.data.commodity));
      notify.success(`${commodity.name} settings saved`);
    } catch (err) {
      const { message, fieldErrors } = extractApiError(err);
      for (const field of FIELDS) {
        if (fieldErrors?.[field.name]) {
          setError(field.name, { message: fieldErrors[field.name] });
        }
      }
      notify.error(`Couldn't save ${commodity.name}`, { description: message });
    }
  };

  return (
    <AdminCard className="px-5 py-[18px]">
      <form
        noValidate
        aria-label={`${commodity.name} book settings`}
        onSubmit={handleSubmit(onSubmit)}
        className="@container flex flex-col gap-4"
      >
        <h2 className="min-w-0 text-[14px] font-bold text-adm-ink [overflow-wrap:anywhere]">
          {commodity.name}
        </h2>
        <div className="grid gap-4 @min-[440px]:grid-cols-2 @min-[900px]:grid-cols-5">
          {FIELDS.map((field) => (
            <AdminField
              key={field.name}
              label={field.label}
              hint={field.hint}
              error={errors[field.name]?.message}
            >
              <Input
                inputMode="decimal"
                placeholder={field.placeholder}
                disabled={!canManage}
                className={cn(adminInputClass, "font-adminmono")}
                {...register(field.name)}
              />
            </AdminField>
          ))}
        </div>
        {canManage ? (
          <div className="flex justify-end gap-2">
            {isDirty ? (
              <AdminButton
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => reset()}
              >
                Undo
              </AdminButton>
            ) : null}
            <AdminButton
              type="submit"
              disabled={!isDirty || isLoading}
              loading={isLoading}
            >
              {isLoading ? "Saving…" : "Save"}
            </AdminButton>
          </div>
        ) : null}
      </form>
    </AdminCard>
  );
}

/**
 * The one place the books' conventions are set: each commodity's bag size and
 * its FM rules for buying and for selling. Purchases and arrivals only record
 * the test result of the load in front of them; everything else comes from
 * here.
 */
export function BookSettings() {
  // A page of the register at a time, however long it grows.
  const [page, setPage] = useState(1);
  const commodities = useGetCommoditiesQuery({ limit: 20, page });
  // Only the owner edits this vocabulary, as on the commodity register.
  const { isSuperAdmin } = useAuthRole();
  const { has } = usePermissions();
  const canManage = isSuperAdmin || has("VOCABULARY_MANAGE");
  const list = commodities.data?.data ?? [];
  return (
    <div>
      <AdminPageHeader
        title="Book settings"
        hint="Set once here, used everywhere: the purchase and sales books, the purchase form and the arrival of a truck all read the bag size and FM rules from this page."
        sub="Each commodity's bag size and FM rules, for buying and for selling"
      />
      {commodities.isLoading ? (
        <Skeleton className="h-[320px] w-full rounded-none" />
      ) : commodities.isError ? (
        <WidgetError
          onRetry={() => void commodities.refetch()}
          what="the book settings"
        />
      ) : list.length === 0 ? (
        <WidgetEmpty
          title="No commodities yet"
          hint="Add a commodity and its book settings appear here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-[12px] text-adm-muted">
            A new bag size recounts the bags across the books at once. A changed
            FM rule applies to purchases and arrivals recorded from now on: what
            a supplier was already owed, or a buyer already billed, is never
            rewritten.
          </p>
          {list.map((c) => (
            <CommodityRow key={c.id} canManage={canManage} commodity={c} />
          ))}
          <ListPagination
            page={page}
            totalPages={commodities.data?.meta.totalPages ?? 1}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
