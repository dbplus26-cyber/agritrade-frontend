"use client";

import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { useIdempotencyKey } from "@/components/admin/disbursements/disbursement-bits";
import { ExpensePaymentFields } from "@/components/admin/expenses/expense-payment-fields";
import {
  AdminButton,
  AdminField,
  adminInputClass,
  adminSelectClass,
  ChoiceCards,
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
import {
  capitaliseToTreatment,
  COST_TREATMENT_LEGEND,
  COST_TREATMENT_OPTIONS,
  treatmentToCapitalise,
} from "@/lib/cost-treatment";
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import { useGetSettlementAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import { useAddPurchaseCostMutation } from "@/redux/purchases/purchases-api";
import { PURCHASE_VOIDED_CODE } from "@/types/purchase.types";
import type { IExpenseCategory } from "@/types/registry.types";
import {
  expensePaymentBody,
  PAYMENT_FIELD_FOR_CODE,
} from "@/validations/expense-payment-fields";
import {
  makePurchaseCostSchema,
  type PurchaseCostValues,
} from "@/validations/purchase-schema";

import { todayInputValue } from "./purchase-bits";

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
 *   * it asks whether the cost has been PAID, and settles it in the same
 *     request when it has. Paying the loading boys at the farm gate is the
 *     ordinary case here, and making somebody find the voucher on another
 *     screen to say so is how a cost stays owed on the books while the money
 *     has demonstrably gone.
 */
export function PurchaseCostDialog({
  categories,
  categoriesLoading = false,
  onOpenChange,
  open,
  purchaseId,
}: {
  categories: IExpenseCategory[];
  /**
   * The vocabulary is fetched only when this dialog is wanted, so on a village
   * 2G line it can still be in flight when the sheet opens. Said out loud in
   * the picker, because an empty dropdown with a "Choose a category" prompt
   * reads as a registry with nothing in it, and the way out of that is to back
   * out of the form.
   */
  categoriesLoading?: boolean;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  purchaseId: string;
}) {
  const [addCost, { isLoading }] = useAddPurchaseCostMutation();
  // The reference rule depends on WHICH account was picked - no statement
  // arrives for somebody's own pocket - so the schema is built from the list
  // the picker offers. Memoised on the accounts themselves: a resolver rebuilt
  // every render resets the form's validation state under the user.
  const { data: accounts } = useGetSettlementAccountsQuery();
  const schema = useMemo(
    () =>
      makePurchaseCostSchema({
        heldAccountIds: new Set(
          (accounts?.data.accounts ?? [])
            .filter((a) => a.holder !== null)
            .map((a) => a.id),
        ),
      }),
    [accounts],
  );
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
    setValue,
    watch,
  } = useForm<PurchaseCostValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountGhs: "",
      capitalise: true,
      categoryId: "",
      description: "",
      incurredAt: todayInputValue(),
      method: "CASH",
      paidNow: true,
      paymentAccountId: "",
      reference: "",
    },
  });

  const method = watch("method");
  const paidNow = watch("paidNow");

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
      method: "CASH",
      paidNow: true,
      paymentAccountId: "",
      reference: "",
    });
  }, [open, reset]);

  // An account offered under one method is not offered under another, so
  // switching the method clears the pick rather than leaving a bank account
  // attached to a cash payment - which the server refuses after the trigger
  // has already stopped showing it.
  useEffect(() => {
    setValue("paymentAccountId", "");
  }, [method, setValue]);

  const onSubmit = async (values: PurchaseCostValues) => {
    const payment = expensePaymentBody(values);
    try {
      const res = await addCost({
        body: {
          amountGhs: Number(values.amountGhs),
          capitalise: values.capitalise,
          categoryId: values.categoryId,
          ...(values.description ? { description: values.description } : {}),
          incurredAt: values.incurredAt,
          // No amount in it: the server settles the whole cost.
          ...(payment ? { payment } : {}),
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
            res.data.settlement.status === "UNPAID"
              ? "Nothing has gone out yet. Pay it from its voucher in Expenses."
              : "Paid, and taken off the account it came from.",
        },
      );
      onOpenChange(false);
    } catch (error) {
      const { code, message } = extractApiError(error);
      const field = code
        ? (FIELD_FOR_CODE[code] ?? PAYMENT_FIELD_FOR_CODE[code])
        : undefined;
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
                  placeholder={
                    categoriesLoading
                      ? "Loading categories…"
                      : categories.length === 0
                        ? "No expense categories are set up"
                        : "Choose a category…"
                  }
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
                placeholder="Pick the date incurred"
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
                  legend={COST_TREATMENT_LEGEND}
                  name="purchase-cost-treatment"
                  onChange={(v) => {
                    field.onChange(treatmentToCapitalise(v));
                  }}
                  options={COST_TREATMENT_OPTIONS}
                  value={capitaliseToTreatment(field.value)}
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

          <ExpensePaymentFields
            control={control}
            errors={errors}
            idPrefix="purchase-cost"
            method={method}
            owedNote="Nothing goes out yet. The cost is recorded as owed, and is paid from its own voucher once the money moves."
            paidNow={paidNow}
            register={register}
          />

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
            <AdminButton disabled={isLoading} loading={isLoading} type="submit">
              {isLoading ? "Saving…" : "Record cost"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
