"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { AdminButton, AdminField, adminInputClass, adminSelectClass } from "@/components/admin/ui";
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
              ? "This moves a figure the profit report is computed from — the change is audited."
              : "Rent, salaries, fumigation, repairs — anything the business pays out."}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          noValidate
        >
          <AdminField
            label="Category"
            hint="The heading this cost is filed under, so spending can be grouped in reports."
            error={errors.categoryId?.message}
          >
            <select
              id="expense-category"
              className={adminSelectClass}
              {...register("categoryId")}
            >
              <option value="">Choose a category…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Amount (GH₵)" error={errors.amountGhs?.message}>
            <input
              id="expense-amount"
              inputMode="decimal"
              placeholder="0.00"
              className={adminInputClass}
              {...register("amountGhs")}
            />
          </AdminField>

          <AdminField
            label="Date incurred"
            hint="The day the cost was actually run up, not the day it is being typed in."
            error={errors.incurredAt?.message}
          >
            <input
              id="expense-date"
              type="date"
              max={today()}
              className={adminInputClass}
              {...register("incurredAt")}
            />
          </AdminField>

          <AdminField label="Description" error={errors.description?.message} optional>
            <input
              id="expense-description"
              placeholder="e.g. Warehouse rent — July"
              className={adminInputClass}
              {...register("description")}
            />
          </AdminField>

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
