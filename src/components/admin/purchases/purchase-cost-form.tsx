"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useIdempotencyKey } from "@/components/admin/disbursements/disbursement-bits";
import { ChoiceCards } from "@/components/admin/farm/farm-cash-source";
import {
  AdminButton,
  AdminField,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { DateInput } from "@/components/ui/date-input";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { SimpleSelect } from "@/components/ui/simple-select";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { useAddPurchaseCostMutation } from "@/redux/purchases/purchases-api";
import { PURCHASE_VOIDED_CODE } from "@/types/purchase.types";
import type { IExpenseCategory } from "@/types/registry.types";
import {
  purchaseCostSchema,
  type PurchaseCostValues,
} from "@/validations/purchase-schema";

import { todayInputValue } from "./purchase-bits";

/**
 * The one decision this form exists to ask, in the words the business uses.
 *
 * "Capitalise" is the accountant's word for the first answer and it is not on
 * this screen on purpose: the person recording a cost at a village scale knows
 * perfectly well whether the money was spent getting the grain in, and does
 * not know what capitalising is. Both answers are legitimate - haulage belongs
 * in the goods, a late-permit fine does not - which is exactly why it is asked
 * rather than assumed from the fact that the cost names a purchase.
 *
 * The order is not arbitrary: the goods answer is first and is the default,
 * because it is the overwhelming majority of what gets recorded here.
 */
const TREATMENT_OPTIONS = [
  {
    hint: "Haulage, loading, porters, bagging - money spent getting this grain in. It counts against the profit when the grain is sold, not this month.",
    label: "Part of what these goods cost",
    value: "goods" as const,
  },
  {
    hint: "A licence or a fine: tied to this purchase, but not part of what the grain cost to buy. It lands in this month's costs.",
    label: "A cost of this month",
    value: "month" as const,
  },
];

/**
 * Which field a refused cost belongs to, so the reader is not left hunting.
 * The server checks the category is still live after this form has already
 * let the submission through.
 */
const FIELD_FOR_CODE: Record<string, "categoryId"> = {
  INACTIVE_CATEGORY: "categoryId",
};

/**
 * Records a cost incurred to acquire one purchase's goods.
 *
 * Deliberately the same operation as the expenses register's form pointed at a
 * purchase: same category vocabulary, same 2dp amount, same idempotency key on
 * every submission. Two things differ, and both are the endpoint's contract
 * rather than a choice made here:
 *
 *   * it asks where the cost belongs, because that is the fact only a person
 *     can supply and it cannot be revised afterwards;
 *   * it does NOT offer to pay the cost in the same act. The purchase-cost
 *     endpoint takes no payment, so offering the field would collect a
 *     payment the server drops on the floor and tell somebody their money had
 *     moved. The cost lands owed and is settled from its own voucher.
 */
export function PurchaseCostDialog({
  categories,
  onOpenChange,
  open,
  purchaseId,
}: {
  categories: IExpenseCategory[];
  onOpenChange: (open: boolean) => void;
  open: boolean;
  purchaseId: string;
}) {
  const [addCost, { isLoading }] = useAddPurchaseCostMutation();
  // One key per OPENING of the dialog, reused by every attempt at submitting
  // it. A cost that lands twice is charged into the goods twice, and there is
  // no correction for that short of voiding one of the vouchers.
  const idempotencyKey = useIdempotencyKey(open);

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<PurchaseCostValues>({
    resolver: zodResolver(purchaseCostSchema),
    defaultValues: {
      amountGhs: "",
      capitalise: true,
      categoryId: "",
      description: "",
      incurredAt: todayInputValue(),
    },
  });

  // Cleared each time the dialog opens, so reopening after a cancel never
  // shows the last attempt's half-typed figures under a fresh key.
  useEffect(() => {
    if (!open) return;
    reset({
      amountGhs: "",
      capitalise: true,
      categoryId: "",
      description: "",
      incurredAt: todayInputValue(),
    });
  }, [open, reset]);

  const onSubmit = async (values: PurchaseCostValues) => {
    try {
      await addCost({
        body: {
          amountGhs: Number(values.amountGhs),
          capitalise: values.capitalise,
          categoryId: values.categoryId,
          ...(values.description ? { description: values.description } : {}),
          incurredAt: values.incurredAt,
        },
        idempotencyKey: idempotencyKey(),
        purchaseId,
      }).unwrap();
      notify.success(
        values.capitalise
          ? "Cost recorded - it is now part of what these goods cost"
          : "Cost recorded against this purchase",
        {
          description:
            "Nothing has gone out yet. Pay it from its voucher in Expenses.",
        },
      );
      onOpenChange(false);
    } catch (error) {
      const { code, message } = extractApiError(error);
      const field = code ? FIELD_FOR_CODE[code] : undefined;
      if (field) setError(field, { message });
      notify.error(
        code === PURCHASE_VOIDED_CODE
          ? "This purchase was voided"
          : "Couldn't record the cost",
        { description: message },
      );
    }
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[480px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Record a cost</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            What was spent around this purchase, so the profit on it can be
            worked out properly.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* The amount/date pair measures against this FORM rather than the
            viewport: inside a 480px dialog a `sm:` pair never fires at all on
            a phone-width sheet, and fires too eagerly on a desktop one. */}
        <form
          className="@container grid gap-5"
          noValidate
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
        >
          <AdminField
            error={errors.categoryId?.message}
            hint="The heading this cost is filed under, so spending can be grouped in reports."
            label="Category"
          >
            <Controller
              control={control}
              name="categoryId"
              render={({ field }) => (
                <SimpleSelect
                  className={adminSelectClass}
                  id="purchase-cost-category"
                  onChange={field.onChange}
                  options={categories.map((c) => ({
                    label: c.name,
                    value: c.id,
                  }))}
                  placeholder="Choose a category…"
                  value={field.value}
                />
              )}
            />
          </AdminField>

          <AdminField
            error={errors.description?.message}
            label="Description"
            optional
          >
            <input
              className={adminInputClass}
              id="purchase-cost-description"
              placeholder="e.g. Haulage, Kpandai to the Tamale shed"
              {...register("description")}
            />
          </AdminField>

          <div className="grid gap-5 @min-[380px]:grid-cols-2">
            <AdminField error={errors.amountGhs?.message} label="Amount (GH₵)">
              <input
                className={adminInputClass}
                id="purchase-cost-amount"
                inputMode="decimal"
                placeholder="e.g. 400.00"
                {...register("amountGhs")}
              />
            </AdminField>

            <AdminField
              error={errors.incurredAt?.message}
              hint="The day the cost was actually run up, not the day it is being typed in."
              label="Date incurred"
            >
              <DateInput
                className={adminInputClass}
                id="purchase-cost-date"
                max={todayInputValue()}
                {...register("incurredAt")}
              />
            </AdminField>
          </div>

          <section className="grid gap-2 border-t border-adm-hairline pt-5">
            <Controller
              control={control}
              name="capitalise"
              render={({ field }) => (
                <ChoiceCards
                  legend="Where does this cost belong?"
                  name="purchase-cost-treatment"
                  onChange={(v) => {
                    field.onChange(v === "goods");
                  }}
                  options={TREATMENT_OPTIONS}
                  value={field.value ? "goods" : "month"}
                />
              )}
            />
            {/* Said before the choice is committed, not after. The answer is
                written into the books on the day the cost was incurred, and
                moving it later would take the cost out of a month somebody has
                already read and closed. */}
            <p className="text-[12px] leading-[1.45] text-adm-muted">
              This is decided once. It cannot be changed after the cost is
              saved.
            </p>
          </section>

          <p className="text-[12.5px] leading-[1.45] text-adm-muted">
            Nothing goes out yet. The cost is recorded as owed, and is paid from
            its own voucher once the money moves.
          </p>

          <ResponsiveDialogFooter className="mt-2 gap-2">
            <AdminButton
              onClick={() => {
                onOpenChange(false);
              }}
              type="button"
              variant="ghost"
            >
              Cancel
            </AdminButton>
            <AdminButton disabled={isLoading} type="submit">
              {isLoading ? "Saving…" : "Record cost"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
