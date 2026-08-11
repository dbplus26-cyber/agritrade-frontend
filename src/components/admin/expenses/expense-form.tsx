"use client";

import { DateInput } from "@/components/ui/date-input";
import { useEffect } from "react";
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
import { extractApiError } from "@/lib/extract-api-error";
import { notify } from "@/lib/notify";
import {
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
} from "@/redux/expenses/expenses-api";
import type { IExpense } from "@/types/expense.types";
import type { IExpenseCategory } from "@/types/registry.types";
import { expenseSchema, type ExpenseValues } from "@/validations/expense-schema";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Record or correct an operating cost. One dialog for both: an `expense` prop
 * switches it to edit mode, so the two paths cannot drift in validation or copy.
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

  const {
    control,
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ExpenseValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amountGhs: "",
      categoryId: "",
      description: "",
      incurredAt: today(),
    },
  });

  // Seed from the record each time the dialog opens, so reopening after a
  // cancel never shows the previous edit's half-typed values.
  useEffect(() => {
    if (!open) return;
    reset({
      amountGhs: expense?.amountGhs != null ? String(expense.amountGhs) : "",
      categoryId: expense?.category.id ?? "",
      description: expense?.description ?? "",
      incurredAt: expense?.incurredAt.slice(0, 10) ?? today(),
    });
  }, [expense, open, reset]);

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
        await create(body).unwrap();
        notify.success("Expense recorded");
      }
      onOpenChange(false);
    } catch (error) {
      notify.error(extractApiError(error).message);
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
                  {...register("incurredAt")}
                />
              </AdminField>
            </div>
          </section>

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
