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
import { PaymentAccountField } from "@/components/admin/payment-account-field";
import { PAYMENT_METHOD_OPTIONS } from "@/components/admin/trading/sale-bits";
import { extractApiError } from "@/lib/extract-api-error";
import { useGetSettlementAccountsQuery } from "@/redux/payment-accounts/payment-accounts-api";
import { notify } from "@/lib/notify";
import { cn } from "@/lib/utils";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "@/redux/expenses/expenses-api";
import type { IExpense } from "@/types/expense.types";
import type { IExpenseCategory } from "@/types/registry.types";
import {
  type ExpenseValues,
  makeExpenseSchema,
} from "@/validations/expense-schema";

const today = () => new Date().toISOString().slice(0, 10);

/** The two answers to "has this been paid", in the order they are given. */
const PAID_CHOICES = [
  { label: "Paid now", value: true },
  { label: "Paying later", value: false },
] as const;

/**
 * Which field a refused payment belongs to. The server checks these after the
 * form has already let the submission through - a retired account, an account
 * that cannot carry the method - and a toast about it leaves the reader
 * hunting for which of six fields to change.
 */
const FIELD_FOR_CODE: Record<string, "paymentAccountId" | "reference"> = {
  ACCOUNT_METHOD_MISMATCH: "paymentAccountId",
  ACCOUNT_NOT_SETTLEABLE: "paymentAccountId",
  ACCOUNT_REQUIRED: "paymentAccountId",
  ACCOUNT_RETIRED: "paymentAccountId",
  DUPLICATE_REFERENCE: "reference",
  REFERENCE_REQUIRED: "reference",
};

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
            ...(values.paidNow
              ? {
                  payment: {
                    method: values.method,
                    // The cost and its settlement are one act here, so the
                    // payment carries the day the cost was run up rather than
                    // silently landing on today - a voucher written up on
                    // Monday for Friday's fuel was paid on Friday.
                    paidAt: values.incurredAt,
                    // No amount: the server settles the whole cost.
                    ...(values.paymentAccountId
                      ? { paymentAccountId: values.paymentAccountId }
                      : {}),
                    ...(values.reference
                      ? { reference: values.reference }
                      : {}),
                  },
                }
              : {}),
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
      const field = code ? FIELD_FOR_CODE[code] : undefined;
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
            <section className="grid gap-5 border-t border-adm-hairline pt-5">
              {/* Two taps, both thumb-sized and side by side at every width:
                  this is the question the whole screen turns on, and it is
                  answered far more often than it is read. */}
              <div>
                <span className="mb-1 flex text-[13px] font-semibold text-adm-ink">
                  Has this been paid?
                </span>
                <Controller
                  control={control}
                  name="paidNow"
                  render={({ field }) => (
                    <div
                      aria-label="Has this been paid?"
                      className="grid grid-cols-2 gap-2"
                      role="group"
                    >
                      {PAID_CHOICES.map((choice) => (
                        <button
                          aria-pressed={field.value === choice.value}
                          className={cn(
                            "min-h-[44px] cursor-pointer rounded-none border px-3 text-[13.5px] font-semibold transition-colors",
                            field.value === choice.value
                              ? "border-console bg-console text-white"
                              : "border-adm-line bg-adm-card text-adm-body hover:bg-adm-sunken",
                          )}
                          key={choice.label}
                          onClick={() => {
                            field.onChange(choice.value);
                          }}
                          type="button"
                        >
                          {choice.label}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>

              {paidNow ? (
                <>
                  <AdminField label="How it was paid">
                    <Controller
                      control={control}
                      name="method"
                      render={({ field }) => (
                        <SimpleSelect
                          className={adminSelectClass}
                          id="expense-method"
                          onChange={field.onChange}
                          placeholder="Choose how it was paid"
                          options={PAYMENT_METHOD_OPTIONS}
                          value={field.value}
                        />
                      )}
                    />
                  </AdminField>

                  {/* Offered for cash too, unlike the settle-later dialog: an
                      agent who pays for a repair out of the money they are
                      holding is where that money went, and booking it to the
                      office till says the cash is in a box it left. */}
                  <Controller
                    control={control}
                    name="paymentAccountId"
                    render={({ field }) => (
                      <PaymentAccountField
                        direction="out"
                        error={errors.paymentAccountId?.message}
                        method={method}
                        onChange={field.onChange}
                        value={field.value}
                      />
                    )}
                  />

                  <AdminField
                    error={errors.reference?.message}
                    hint="The transfer or MoMo id. Recording the same one twice against this cost is refused."
                    label="Reference"
                    optional={method === "CASH"}
                  >
                    <input
                      className={adminInputClass}
                      id="expense-reference"
                      placeholder="e.g. TRF884512"
                      {...register("reference")}
                    />
                  </AdminField>
                </>
              ) : (
                <p className="text-[12.5px] text-adm-muted">
                  Nothing goes out yet. The cost is recorded as owed, and can be
                  paid from the voucher once the money moves.
                </p>
              )}
            </section>
          )}

          <ResponsiveDialogFooter className="mt-2 gap-2">
            <AdminButton
              type="button"
              variant="ghost"
              onClick={() => { onOpenChange(false); }}
            >
              Cancel
            </AdminButton>
            <AdminButton type="submit" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Record expense"}
            </AdminButton>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
