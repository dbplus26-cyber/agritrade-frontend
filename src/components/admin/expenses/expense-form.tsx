"use client";

import { DateInput } from "@/components/ui/date-input";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
  AdminButton,
  AdminField,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/ui";
import { useIdempotencyKey } from "@/components/admin/disbursements/disbursement-bits";
import { ExpensePaymentFields } from "@/components/admin/expenses/expense-payment-fields";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetSettlementAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import { notify } from "@/lib/notify";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "@/redux/expenses/expenses-api";
import type { IExpense } from "@/types/expense.types";
import type { IExpenseCategory } from "@/types/registry.types";
import {
  expensePaymentBody,
  PAYMENT_FIELD_FOR_CODE,
} from "@/validations/expense-payment-fields";
import {
  type ExpenseValues,
  makeExpenseSchema,
} from "@/validations/expense-schema";

const today = () => new Date().toISOString().slice(0, 10);


/**
 * Record or correct an operating cost. One dialog for both: an `expense` prop
 * switches it to edit mode, so the two paths cannot drift in validation or copy.
 *
 * Recording also PAYS the cost, in the same submission, because that is what
 * happens in the room: rent is handed over, the fitter is paid, and the
 * voucher is written afterwards. Splitting the two meant every such cost was
 * entered here and then had to be chased on its own page, and any that was not
 * chased sat in the books as money still owed that had already gone out.
 *
 * Editing does not offer the payment half. A correction is a decision about a
 * cost that already exists, and its settlement has its own screen with its own
 * ledger and reversals - one that can undo a payment, which this cannot.
 */
export function ExpenseFormDialog({
  categories,
  expense,
  onOpenChange,
  open,
}: {
  categories: IExpenseCategory[];
  /** Present in edit mode. */
  expense?: IExpense;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [create, { isLoading: creating }] = useCreateExpenseMutation();
  const [update, { isLoading: updating }] = useUpdateExpenseMutation();
  const isEdit = Boolean(expense);
  // One key per OPENING of the dialog, reused by every attempt at submitting
  // it: this endpoint moves money, so a double tap or a resend after a
  // timeout must resolve to the one payment that already happened.
  const idempotencyKey = useIdempotencyKey(open);

  // The reference rule depends on WHICH account was picked: the office gets no
  // statement for somebody's personal wallet, so the server does not demand a
  // reference there and neither should this form. Built from the same list the
  // picker offers, so the two can never disagree about which accounts those
  // are. Memoised on the accounts themselves, because a resolver rebuilt on
  // every render resets the form's validation state under the user.
  const { data: accounts } = useGetSettlementAccountsQuery();
  const schema = useMemo(
    () =>
      makeExpenseSchema({
        heldAccountIds: new Set(
          (accounts?.data.accounts ?? [])
            .filter((a) => a.holder !== null)
            .map((a) => a.id),
        ),
      }),
    [accounts],
  );

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<ExpenseValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amountGhs: "",
      categoryId: "",
      description: "",
      incurredAt: today(),
      method: "CASH",
      paidNow: true,
      paymentAccountId: "",
      reference: "",
    },
  });

  const paidNow = watch("paidNow");
  const method = watch("method");

  // Seed from the record each time the dialog opens, so reopening after a
  // cancel never shows the previous edit's half-typed values.
  useEffect(() => {
    if (!open) return;
    reset({
      amountGhs: expense?.amountGhs != null ? String(expense.amountGhs) : "",
      categoryId: expense?.category.id ?? "",
      description: expense?.description ?? "",
      incurredAt: expense?.incurredAt.slice(0, 10) ?? today(),
      method: "CASH",
      // A correction never pays anything, and an edit that quietly settled the
      // cost it was correcting would be a second payment nobody asked for.
      paidNow: !expense,
      paymentAccountId: "",
      reference: "",
    });
  }, [expense, open, reset]);

  // An account offered under one method is not offered under another - the
  // list narrows to the kinds that method can move on - so switching the
  // method clears the pick rather than leaving a bank account attached to a
  // cash payment, which the server refuses (ACCOUNT_METHOD_MISMATCH) after the
  // trigger has already stopped showing it.
  useEffect(() => {
    setValue("paymentAccountId", "");
  }, [method, setValue]);

  const onSubmit = async (values: ExpenseValues) => {
    const payment = expensePaymentBody(values);
    const body = {
      amountGhs: Number(values.amountGhs),
      categoryId: values.categoryId,
      description: values.description?.trim() || undefined,
      incurredAt: values.incurredAt,
    };
    try {
      if (expense) {
        await update({ body, id: expense.id }).unwrap();
        notify.success("Expense updated");
      } else {
        const res = await create({
          body: {
            ...body,
            // No amount in it: the server settles the whole cost.
            ...(payment ? { payment } : {}),
          },
          idempotencyKey: idempotencyKey(),
        }).unwrap();
        notify.success(
          res.data.settlement.status === "UNPAID"
            ? "Expense recorded - this is still owed"
            : "Expense recorded and paid",
        );
      }
      onOpenChange(false);
    } catch (error) {
      const { code, message } = extractApiError(error);
      const field = code ? PAYMENT_FIELD_FOR_CODE[code] : undefined;
      if (field) setError(field, { message });
      notify.error(message);
    }
  };

  const busy = creating || updating;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[480px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>
            {isEdit ? "Correct expense" : "Record expense"}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {isEdit
              ? "This moves a figure the profit report is computed from - the change is audited."
              : "Rent, salaries, fumigation, repairs - anything the business pays out."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {/* The amount/date pair measures against this form rather than the
            viewport: inside a 480px dialog a `sm:` pair never fires at all on
            a phone-width sheet, and fires too eagerly on a desktop one. */}
        <form
          className="@container grid gap-5"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          noValidate
        >
          <section className="grid gap-5">
            <AdminField
              label="Category"
              hint="The heading this cost is filed under, so spending can be grouped in reports."
              error={errors.categoryId?.message}
            >
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <SimpleSelect
                    id="expense-category"
                    className={adminSelectClass}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Choose a category…"
                    options={categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                    }))}
                  />
                )}
              />
            </AdminField>

            <AdminField label="Description" error={errors.description?.message} optional>
              <input
                id="expense-description"
                placeholder="e.g. Warehouse rent, July"
                className={adminInputClass}
                {...register("description")}
              />
            </AdminField>
          </section>

          <section className="grid gap-5">
            <div className="grid gap-5 @min-[380px]:grid-cols-2">
              <AdminField label="Amount (GH₵)" error={errors.amountGhs?.message}>
                <input
                  id="expense-amount"
                  inputMode="decimal"
                  placeholder="e.g. 850.00"
                  className={adminInputClass}
                  {...register("amountGhs")}
                />
              </AdminField>

              <AdminField
                label="Date incurred"
                hint="The day the cost was actually run up, not the day it is being typed in."
                error={errors.incurredAt?.message}
              >
                <DateInput
                  id="expense-date"
                  max={today()}
                  className={adminInputClass}
                  placeholder="Pick the date it was incurred"
                  {...register("incurredAt")}
                />
              </AdminField>
            </div>
          </section>

          {isEdit ? null : (
            <ExpensePaymentFields
              control={control}
              errors={errors}
              idPrefix="expense"
              method={method}
              owedNote="Nothing goes out yet. The cost is recorded as owed, and can be paid from the voucher once the money moves."
              paidNow={paidNow}
              register={register}
            />
          )}

          <ResponsiveDialogFooter className="mt-2 gap-2">
            <AdminButton
              type="button"
              variant="ghost"
              onClick={() => { onOpenChange(false); }}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={busy} loading={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Record expense"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
